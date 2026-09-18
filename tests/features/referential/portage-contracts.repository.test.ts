// Integration tests for
// `src/features/referential/portage-contracts.repository.ts`, against a
// real SQLite file migrated from `prisma/migrations/`
// (`ai-rules/policy_testing.md` -> Database testing). Prisma itself is
// never mocked - this is the actual query, run for real.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createTestDatabase,
  type TestDatabase,
} from "../../support/testDatabase";
import type { PrismaClient } from "@/generated/prisma/client";

let testDb: TestDatabase;
let repository: typeof import("@/features/referential/portage-contracts.repository");
let prisma: PrismaClient;

beforeAll(async () => {
  testDb = createTestDatabase();
  process.env.DATABASE_URL = testDb.databaseUrl;

  repository =
    await import("@/features/referential/portage-contracts.repository");
  ({ prisma } = await import("@/lib/db"));
});

afterAll(() => {
  testDb.cleanup();
});

beforeEach(async () => {
  await prisma.portageContract.deleteMany();
});

/** The minimal input `createPortageContract` accepts. */
const baseContractInput = {
  label: "Contract A",
  companyName: "Portage Co",
  chargeRateBasisPoints: 2460,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null,
};

describe("createPortageContract", () => {
  it("creates a contract, active by default", async () => {
    const contract = await repository.createPortageContract(baseContractInput);

    expect(contract.label).toBe("Contract A");
    expect(contract.companyName).toBe("Portage Co");
    expect(contract.chargeRateBasisPoints).toBe(2460);
    expect(contract.validFrom).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(contract.validTo).toBeNull();
    expect(contract.active).toBe(true);
  });

  it("stores an explicit end date when one is given", async () => {
    const contract = await repository.createPortageContract({
      ...baseContractInput,
      validTo: new Date("2026-12-31T00:00:00.000Z"),
    });

    expect(contract.validTo).toEqual(new Date("2026-12-31T00:00:00.000Z"));
  });
});

describe("listPortageContracts", () => {
  it("returns every contract ordered by label", async () => {
    await repository.createPortageContract({
      ...baseContractInput,
      label: "Zeta",
    });
    await repository.createPortageContract({
      ...baseContractInput,
      label: "Alpha",
    });

    const contracts = await repository.listPortageContracts();

    expect(contracts.map((contract) => contract.label)).toEqual([
      "Alpha",
      "Zeta",
    ]);
  });

  it("returns an empty list when no contract exists", async () => {
    expect(await repository.listPortageContracts()).toEqual([]);
  });

  it("returns every record with no artificial cap - no pagination in this feature", async () => {
    for (let index = 0; index < 50; index += 1) {
      await repository.createPortageContract({
        ...baseContractInput,
        label: `Contract ${String(index).padStart(3, "0")}`,
      });
    }

    const contracts = await repository.listPortageContracts();

    expect(contracts).toHaveLength(50);
  });

  it("allows two contracts for the same company with overlapping validity periods - no rejection, no filtering", async () => {
    const first = await repository.createPortageContract({
      ...baseContractInput,
      label: "Contract 1",
      companyName: "Same Portage Co",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validTo: new Date("2026-06-30T00:00:00.000Z"),
    });
    const second = await repository.createPortageContract({
      ...baseContractInput,
      label: "Contract 2",
      companyName: "Same Portage Co",
      validFrom: new Date("2026-04-01T00:00:00.000Z"),
      validTo: new Date("2026-12-31T00:00:00.000Z"),
    });

    const contracts = await repository.listPortageContracts();
    const ids = contracts.map((contract) => contract.id);

    expect(ids).toContain(first.id);
    expect(ids).toContain(second.id);
    expect(contracts).toHaveLength(2);
  });
});

describe("updatePortageContract", () => {
  it("persists every editable field, including the charge rate and both validity dates", async () => {
    const contract = await repository.createPortageContract(baseContractInput);

    const updated = await repository.updatePortageContract(contract.id, {
      label: "New label",
      companyName: "New Co",
      chargeRateBasisPoints: 3000,
      validFrom: new Date("2026-02-01T00:00:00.000Z"),
      validTo: new Date("2026-11-30T00:00:00.000Z"),
    });

    expect(updated).toMatchObject({
      label: "New label",
      companyName: "New Co",
      chargeRateBasisPoints: 3000,
    });
    expect(updated.validFrom).toEqual(new Date("2026-02-01T00:00:00.000Z"));
    expect(updated.validTo).toEqual(new Date("2026-11-30T00:00:00.000Z"));
  });

  it("allows changing the charge rate again on a contract already edited once - no field is ever locked", async () => {
    const contract = await repository.createPortageContract(baseContractInput);
    await repository.updatePortageContract(contract.id, {
      label: contract.label,
      companyName: contract.companyName,
      chargeRateBasisPoints: 3000,
      validFrom: contract.validFrom,
      validTo: contract.validTo,
    });

    const secondUpdate = await repository.updatePortageContract(contract.id, {
      label: contract.label,
      companyName: contract.companyName,
      chargeRateBasisPoints: 4500,
      validFrom: contract.validFrom,
      validTo: contract.validTo,
    });

    expect(secondUpdate.chargeRateBasisPoints).toBe(4500);
  });

  it("clears an existing end date back to open-ended when validTo is set to null", async () => {
    const contract = await repository.createPortageContract({
      ...baseContractInput,
      validTo: new Date("2026-12-31T00:00:00.000Z"),
    });

    const updated = await repository.updatePortageContract(contract.id, {
      label: contract.label,
      companyName: contract.companyName,
      chargeRateBasisPoints: contract.chargeRateBasisPoints,
      validFrom: contract.validFrom,
      validTo: null,
    });

    expect(updated.validTo).toBeNull();
  });
});

describe("setPortageContractActive", () => {
  it("deactivates a contract while keeping it in the list", async () => {
    const contract = await repository.createPortageContract(baseContractInput);

    const deactivated = await repository.setPortageContractActive(
      contract.id,
      false,
    );

    expect(deactivated.active).toBe(false);
    const contracts = await repository.listPortageContracts();
    expect(contracts).toHaveLength(1);
    expect(contracts[0]?.active).toBe(false);
  });

  it("reactivates a previously deactivated contract", async () => {
    const contract = await repository.createPortageContract(baseContractInput);
    await repository.setPortageContractActive(contract.id, false);

    const reactivated = await repository.setPortageContractActive(
      contract.id,
      true,
    );

    expect(reactivated.active).toBe(true);
  });

  it("never changes the validity dates when toggling active - independent of each other", async () => {
    const contract = await repository.createPortageContract(baseContractInput);

    const deactivated = await repository.setPortageContractActive(
      contract.id,
      false,
    );

    expect(deactivated.validFrom).toEqual(baseContractInput.validFrom);
    expect(deactivated.validTo).toEqual(baseContractInput.validTo);
  });
});

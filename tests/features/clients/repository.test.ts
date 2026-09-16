// Integration tests for `src/features/clients/repository.ts`, against a real
// SQLite file migrated from `prisma/migrations/`
// (`ai-rules/policy_testing.md` -> Database testing). Prisma itself is never
// mocked - this is the actual query, run for real, including the FK relation
// to `Partner`.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createTestDatabase,
  type TestDatabase,
} from "../../support/testDatabase";
import type { PrismaClient } from "@/generated/prisma/client";

let testDb: TestDatabase;
let repository: typeof import("@/features/clients/repository");
let prisma: PrismaClient;

beforeAll(async () => {
  testDb = createTestDatabase();
  process.env.DATABASE_URL = testDb.databaseUrl;

  repository = await import("@/features/clients/repository");
  ({ prisma } = await import("@/lib/db"));
});

afterAll(() => {
  testDb.cleanup();
});

beforeEach(async () => {
  await prisma.client.deleteMany();
  await prisma.partner.deleteMany();
});

/** The minimal input `createClient` accepts. */
const baseClientInput = {
  name: "Acme",
  shortLabel: "ACME",
  defaultRateCents: 45_000,
};

describe("clients/repository.ts module boundary (AD-004, AD-021)", () => {
  it("never imports from partners/repository.ts", () => {
    // AD-021: `clients/repository.ts` reads the referring partner's `id` and
    // `name` through its own Prisma `include`, never through the partners
    // domain's repository. A structural check on the source itself, because
    // nothing about calling `listClients()` at runtime would fail if that
    // boundary were crossed - the import would simply work.
    const source = readFileSync(
      join(process.cwd(), "src", "features", "clients", "repository.ts"),
      "utf8",
    );

    // Matches an actual module specifier - `from "...partners/repository..."`
    // or a dynamic `import("...partners/repository...")` - not the prose
    // above, which only names the file in backticks to explain why it is
    // absent.
    expect(source).not.toMatch(
      /(?:from\s+|import\()["'][^"']*partners\/repository[^"']*["']/,
    );
  });
});

describe("createClient", () => {
  it("creates a client, active by default", async () => {
    const client = await repository.createClient(baseClientInput);

    expect(client.name).toBe("Acme");
    expect(client.shortLabel).toBe("ACME");
    expect(client.defaultRateCents).toBe(45_000);
    expect(client.active).toBe(true);
    expect(client.partner).toBeNull();
  });

  it("defaults billable to true when omitted", async () => {
    const client = await repository.createClient(baseClientInput);

    expect(client.billable).toBe(true);
  });

  it("respects an explicit billable of false", async () => {
    const client = await repository.createClient({
      ...baseClientInput,
      billable: false,
    });

    expect(client.billable).toBe(false);
  });

  it("links to a partner and joins its id and name", async () => {
    const partner = await prisma.partner.create({ data: { name: "Referrer" } });

    const client = await repository.createClient({
      ...baseClientInput,
      partnerId: partner.id,
    });

    expect(client.partner).toEqual({ id: partner.id, name: "Referrer" });
  });

  it("stores a regime when given one", async () => {
    const client = await repository.createClient({
      ...baseClientInput,
      regime: "MICRO",
    });

    expect(client.regime).toBe("MICRO");
  });
});

describe("listClients", () => {
  it("returns every client, ordered by name", async () => {
    await repository.createClient({ ...baseClientInput, name: "Zeta" });
    await repository.createClient({ ...baseClientInput, name: "Alpha" });

    const clients = await repository.listClients();

    expect(clients.map((client) => client.name)).toEqual(["Alpha", "Zeta"]);
  });

  it("returns an empty list when no client exists", async () => {
    expect(await repository.listClients()).toEqual([]);
  });

  it("keeps showing the linked partner's name after that partner is deactivated", async () => {
    const partner = await prisma.partner.create({ data: { name: "Referrer" } });
    const client = await repository.createClient({
      ...baseClientInput,
      partnerId: partner.id,
    });

    await prisma.partner.update({
      where: { id: partner.id },
      data: { active: false },
    });

    const clients = await repository.listClients();
    const found = clients.find((entry) => entry.id === client.id);

    expect(found?.partner).toEqual({ id: partner.id, name: "Referrer" });
  });
});

describe("getClientById", () => {
  it("returns null for an id that does not exist", async () => {
    expect(await repository.getClientById(999_999)).toBeNull();
  });

  it("keeps showing the linked partner's name after that partner is deactivated", async () => {
    const partner = await prisma.partner.create({ data: { name: "Referrer" } });
    const client = await repository.createClient({
      ...baseClientInput,
      partnerId: partner.id,
    });

    await prisma.partner.update({
      where: { id: partner.id },
      data: { active: false },
    });

    const found = await repository.getClientById(client.id);

    expect(found?.partner).toEqual({ id: partner.id, name: "Referrer" });
  });
});

describe("updateClient", () => {
  it("persists every editable field", async () => {
    const client = await repository.createClient(baseClientInput);
    const partner = await prisma.partner.create({ data: { name: "Referrer" } });

    await repository.updateClient(client.id, {
      name: "New name",
      shortLabel: "NEWNAME",
      billable: false,
      active: false,
      defaultRateCents: 60_000,
      regime: "PORTAGE",
      partnerId: partner.id,
    });

    const found = await repository.getClientById(client.id);
    expect(found).toMatchObject({
      name: "New name",
      shortLabel: "NEWNAME",
      billable: false,
      active: false,
      defaultRateCents: 60_000,
      regime: "PORTAGE",
    });
    expect(found?.partner).toEqual({ id: partner.id, name: "Referrer" });
  });

  it("clears an existing partner link when partnerId is set to null", async () => {
    const partner = await prisma.partner.create({ data: { name: "Referrer" } });
    const client = await repository.createClient({
      ...baseClientInput,
      partnerId: partner.id,
    });

    await repository.updateClient(client.id, {
      name: client.name,
      shortLabel: client.shortLabel,
      active: true,
      defaultRateCents: client.defaultRateCents,
      partnerId: null,
    });

    const found = await repository.getClientById(client.id);
    expect(found?.partner).toBeNull();
  });
});

describe("setClientActive", () => {
  it("flips active without touching other fields", async () => {
    const client = await repository.createClient(baseClientInput);

    const updated = await repository.setClientActive(client.id, false);

    expect(updated.active).toBe(false);
    expect(updated.name).toBe("Acme");
  });

  it("flips active back to true", async () => {
    const client = await repository.createClient(baseClientInput);
    await repository.setClientActive(client.id, false);

    const updated = await repository.setClientActive(client.id, true);

    expect(updated.active).toBe(true);
  });
});

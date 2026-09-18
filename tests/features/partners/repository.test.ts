// Integration tests for `src/features/partners/repository.ts`, against a
// real SQLite file migrated from `prisma/migrations/`
// (`ai-rules/policy_testing.md` -> Database testing). Never against
// `/data/dev.db`, and Prisma itself is never mocked - this is the actual
// query, run for real.
//
// `process.env.DATABASE_URL` is pointed at the temporary database, and the
// repository (which imports the `@/lib/db` singleton) is loaded with a
// dynamic `import()` in `beforeAll`, after that assignment - a static import
// at the top of the file would be hoisted above it and read `undefined`.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createTestDatabase,
  type TestDatabase,
} from "../../support/testDatabase";
import type { PrismaClient } from "@/generated/prisma/client";

let testDb: TestDatabase;
let repository: typeof import("@/features/partners/repository");
let prisma: PrismaClient;

beforeAll(async () => {
  testDb = createTestDatabase();
  process.env.DATABASE_URL = testDb.databaseUrl;

  repository = await import("@/features/partners/repository");
  ({ prisma } = await import("@/lib/db"));
});

afterAll(() => {
  testDb.cleanup();
});

beforeEach(async () => {
  // Clients first: the foreign key would otherwise refuse to clear partners
  // still referenced by a row.
  await prisma.client.deleteMany();
  await prisma.partner.deleteMany();
});

describe("createPartner", () => {
  it("creates a partner that is active by default", async () => {
    const partner = await repository.createPartner({ name: "Acme" });

    expect(partner.name).toBe("Acme");
    expect(partner.active).toBe(true);
    expect(partner.id).toBeGreaterThan(0);
  });

  it("persists the partner so it can be read back by id", async () => {
    const created = await repository.createPartner({ name: "Acme" });

    const found = await repository.getPartnerById(created.id);

    expect(found?.name).toBe("Acme");
    expect(found?.active).toBe(true);
  });
});

describe("listPartners", () => {
  it("returns every partner, ordered by name", async () => {
    await repository.createPartner({ name: "Zeta" });
    await repository.createPartner({ name: "Alpha" });
    await repository.createPartner({ name: "Mid" });

    const partners = await repository.listPartners();

    expect(partners.map((partner) => partner.name)).toEqual([
      "Alpha",
      "Mid",
      "Zeta",
    ]);
  });

  it("returns an empty list when no partner exists", async () => {
    expect(await repository.listPartners()).toEqual([]);
  });

  it("includes inactive partners", async () => {
    const partner = await repository.createPartner({ name: "Acme" });
    await repository.updatePartner(partner.id, { name: "Acme", active: false });

    const partners = await repository.listPartners();

    expect(partners.map((entry) => entry.id)).toContain(partner.id);
  });
});

describe("listActivePartners", () => {
  it("excludes inactive partners", async () => {
    const active = await repository.createPartner({ name: "Active Co" });
    const inactive = await repository.createPartner({ name: "Inactive Co" });
    await repository.updatePartner(inactive.id, {
      name: "Inactive Co",
      active: false,
    });

    const partners = await repository.listActivePartners();
    const ids = partners.map((entry) => entry.id);

    expect(ids).toContain(active.id);
    expect(ids).not.toContain(inactive.id);
  });

  it("includes a reactivated partner again", async () => {
    const partner = await repository.createPartner({ name: "Acme" });
    await repository.updatePartner(partner.id, { name: "Acme", active: false });
    await repository.updatePartner(partner.id, { name: "Acme", active: true });

    const partners = await repository.listActivePartners();

    expect(partners.map((entry) => entry.id)).toContain(partner.id);
  });
});

describe("getPartnerById", () => {
  it("returns null for an id that does not exist", async () => {
    expect(await repository.getPartnerById(999_999)).toBeNull();
  });
});

describe("updatePartner", () => {
  it("persists the new name", async () => {
    const partner = await repository.createPartner({ name: "Old name" });

    await repository.updatePartner(partner.id, {
      name: "New name",
      active: true,
    });

    const found = await repository.getPartnerById(partner.id);
    expect(found?.name).toBe("New name");
  });

  it("persists the active flag alongside the name", async () => {
    const partner = await repository.createPartner({ name: "Acme" });

    await repository.updatePartner(partner.id, {
      name: "Acme",
      active: false,
    });

    const found = await repository.getPartnerById(partner.id);
    expect(found?.active).toBe(false);
  });

  it("never cascades to, and is never blocked by, a client that still references the partner (RG-09)", async () => {
    const partner = await repository.createPartner({ name: "Acme" });
    const client = await prisma.client.create({
      data: {
        name: "End Client",
        shortLabel: "ENDCLIENT",
        defaultRateCents: 10_000,
        partnerId: partner.id,
      },
    });

    await expect(
      repository.updatePartner(partner.id, { name: "Acme", active: false }),
    ).resolves.toMatchObject({ active: false });

    const stillLinked = await prisma.client.findUnique({
      where: { id: client.id },
    });
    expect(stillLinked).not.toBeNull();
    expect(stillLinked?.partnerId).toBe(partner.id);
  });
});

describe("getPartnerWithClients", () => {
  it("returns null for an id that does not exist", async () => {
    expect(await repository.getPartnerWithClients(999_999)).toBeNull();
  });

  it("returns the partner with an empty clients array when none is linked", async () => {
    const partner = await repository.createPartner({ name: "Acme" });

    const found = await repository.getPartnerWithClients(partner.id);

    expect(found).toMatchObject({ id: partner.id, name: "Acme", active: true });
    expect(found?.clients).toEqual([]);
  });

  it("returns every linked client's id, name and active status, ordered by name", async () => {
    const partner = await repository.createPartner({ name: "Acme" });
    const zeta = await prisma.client.create({
      data: {
        name: "Zeta Client",
        shortLabel: "ZETA",
        defaultRateCents: 10_000,
        partnerId: partner.id,
      },
    });
    const alpha = await prisma.client.create({
      data: {
        name: "Alpha Client",
        shortLabel: "ALPHA",
        defaultRateCents: 20_000,
        active: false,
        partnerId: partner.id,
      },
    });

    const found = await repository.getPartnerWithClients(partner.id);

    expect(found?.clients).toEqual([
      { id: alpha.id, name: "Alpha Client", active: false },
      { id: zeta.id, name: "Zeta Client", active: true },
    ]);
  });

  it("never includes a client linked to a different partner", async () => {
    const partner = await repository.createPartner({ name: "Acme" });
    const otherPartner = await repository.createPartner({ name: "Other" });
    await prisma.client.create({
      data: {
        name: "Unrelated Client",
        shortLabel: "UNREL",
        defaultRateCents: 10_000,
        partnerId: otherPartner.id,
      },
    });

    const found = await repository.getPartnerWithClients(partner.id);

    expect(found?.clients).toEqual([]);
  });
});

describe("listClientIdsByPartner", () => {
  it("returns an empty array when no client is linked", async () => {
    const partner = await repository.createPartner({ name: "Acme" });

    expect(await repository.listClientIdsByPartner(partner.id)).toEqual([]);
  });

  it("returns exactly the ids of clients linked to that partner", async () => {
    const partner = await repository.createPartner({ name: "Acme" });
    const otherPartner = await repository.createPartner({ name: "Other" });
    const linked = await prisma.client.create({
      data: {
        name: "Linked Client",
        shortLabel: "LINKED",
        defaultRateCents: 10_000,
        partnerId: partner.id,
      },
    });
    await prisma.client.create({
      data: {
        name: "Unrelated Client",
        shortLabel: "UNREL",
        defaultRateCents: 10_000,
        partnerId: otherPartner.id,
      },
    });

    const ids = await repository.listClientIdsByPartner(partner.id);

    expect(ids).toEqual([linked.id]);
  });
});

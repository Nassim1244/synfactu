// The only file in the partners domain allowed to import the Prisma client
// (AD-004, `ai-rules/policy_architecture.md` -> Data access). Every function
// here takes and returns `PartnerRecord`, a plain domain type - never a raw
// Prisma model. `PARTNER_SELECT` narrows every read and write to exactly the
// fields the domain uses (id, name, active): `createdAt`/`updatedAt` are
// audit-only and never rendered in this feature (spec's "Numeric and
// temporal representation"), so they never cross this boundary
// (`ai-rules/policy_security.md` -> Data exposure, Forbidden - "Returning a
// raw Prisma model to the client").

import { prisma } from "@/lib/db";

/** The plain domain shape every function in this file returns. */
export type PartnerRecord = {
  id: number;
  name: string;
  active: boolean;
};

/** The fields `PartnerRecord` needs - shared by every read and write below. */
const PARTNER_SELECT = {
  id: true,
  name: true,
  active: true,
} as const;

/**
 * Every partner, ordered by name. No scoping: V1 is single-operator, nothing
 * to scope by yet (AD-017).
 */
export function listPartners(): Promise<PartnerRecord[]> {
  return prisma.partner.findMany({
    orderBy: { name: "asc" },
    select: PARTNER_SELECT,
  });
}

/**
 * Every active partner, ordered by name. Feeds the client form's referring-
 * partner `Select` (design screen 5, "options: every active partner"). No
 * scoping: V1 is single-operator, nothing to scope by yet (AD-017).
 */
export function listActivePartners(): Promise<PartnerRecord[]> {
  return prisma.partner.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: PARTNER_SELECT,
  });
}

/** One partner by id, or `null` when it does not exist. No scoping (AD-017). */
export function getPartnerById(id: number): Promise<PartnerRecord | null> {
  return prisma.partner.findUnique({
    where: { id },
    select: PARTNER_SELECT,
  });
}

/** Creates a partner. Always active on creation (functional spec: "created active"). */
export function createPartner(input: { name: string }): Promise<PartnerRecord> {
  return prisma.partner.create({
    data: { name: input.name, active: true },
    select: PARTNER_SELECT,
  });
}

/** Updates a partner's name and active status. */
export function updatePartner(
  id: number,
  input: { name: string; active: boolean },
): Promise<PartnerRecord> {
  return prisma.partner.update({
    where: { id },
    data: { name: input.name, active: input.active },
    select: PARTNER_SELECT,
  });
}

/** One client of `getPartnerWithClients`'s linked-clients list. */
export type PartnerLinkedClient = {
  id: number;
  name: string;
  active: boolean;
};

/** One partner together with its linked clients, or `null` when it does not exist. */
export type PartnerWithClients = PartnerRecord & {
  clients: PartnerLinkedClient[];
};

/**
 * One partner plus its linked clients (id, name, active), ordered by name,
 * or `null` when the id does not resolve - the partner detail view's
 * dataset. No scoping (AD-017).
 */
export function getPartnerWithClients(
  id: number,
): Promise<PartnerWithClients | null> {
  return prisma.partner.findUnique({
    where: { id },
    select: {
      ...PARTNER_SELECT,
      clients: {
        select: { id: true, name: true, active: true },
        orderBy: { name: "asc" },
      },
    },
  });
}

/**
 * Every client id currently linked to a partner. Not a domain read: feeds
 * only `updatePartner`'s revalidation of each linked client's detail page,
 * so it returns a plain `number[]`, not a `PartnerLinkedClient[]`. No
 * scoping (AD-017).
 */
export async function listClientIdsByPartner(
  partnerId: number,
): Promise<number[]> {
  const clients = await prisma.client.findMany({
    where: { partnerId },
    select: { id: true },
  });
  return clients.map((client) => client.id);
}

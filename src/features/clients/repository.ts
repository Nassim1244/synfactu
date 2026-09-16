// The only file in the clients domain allowed to import the Prisma client or
// the `Regime` type (AD-004, `ai-rules/policy_architecture.md` -> Data
// access). Per AD-021's domain boundary, this file never imports from
// `src/features/partners/repository.ts` - the referring partner's `id` and
// `name` are read through this domain's own Prisma `select` instead. Every
// function here takes and returns `ClientRecord`, a plain domain type -
// never a raw Prisma model. `CLIENT_SELECT` narrows every read and write to
// exactly the fields the domain uses: `createdAt`/`updatedAt` are
// audit-only and never rendered in this feature (spec's "Numeric and
// temporal representation"), so they never cross this boundary
// (`ai-rules/policy_security.md` -> Data exposure, Forbidden - "Returning a
// raw Prisma model to the client").

import type { Regime } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * A client together with the referring partner's `id` and `name`, or `null`
 * when it has none - the plain domain shape `listClients`, `getClientById`
 * and every write below return.
 */
export type ClientRecord = {
  id: number;
  name: string;
  shortLabel: string;
  billable: boolean;
  active: boolean;
  defaultRateCents: number;
  regime: Regime | null;
  partnerId: number | null;
  partner: { id: number; name: string } | null;
};

/** The fields `ClientRecord` needs - shared by every read and write below. */
const CLIENT_SELECT = {
  id: true,
  name: true,
  shortLabel: true,
  billable: true,
  active: true,
  defaultRateCents: true,
  regime: true,
  partnerId: true,
  partner: { select: { id: true, name: true } },
} as const;

/** The fields `createClient` accepts. `defaultRateCents` is an integer at this boundary (AD-007): the action layer converts the form's decimal string with `Money.fromDecimalString(...).toCents()` before calling this function. */
type CreateClientInput = {
  name: string;
  shortLabel: string;
  billable?: boolean;
  defaultRateCents: number;
  regime?: Regime | null;
  partnerId?: number | null;
};

/** The fields `updateClient` accepts - the full editable shape of an existing client. */
type UpdateClientInput = {
  name: string;
  shortLabel: string;
  billable?: boolean;
  active: boolean;
  defaultRateCents: number;
  regime?: Regime | null;
  partnerId?: number | null;
};

/**
 * Every client, ordered by name, with its referring partner's `id`/`name`
 * joined in. No scoping: V1 is single-operator, nothing to scope by yet
 * (AD-017).
 */
export function listClients(): Promise<ClientRecord[]> {
  return prisma.client.findMany({
    orderBy: { name: "asc" },
    select: CLIENT_SELECT,
  });
}

/**
 * One client by id, with its referring partner's `id`/`name` joined in, or
 * `null` when it does not exist. No scoping (AD-017).
 */
export function getClientById(id: number): Promise<ClientRecord | null> {
  return prisma.client.findUnique({
    where: { id },
    select: CLIENT_SELECT,
  });
}

/**
 * Creates a client. Always active on creation; `billable` defaults to `true`
 * when omitted (functional spec defaults).
 */
export function createClient(input: CreateClientInput): Promise<ClientRecord> {
  return prisma.client.create({
    data: {
      name: input.name,
      shortLabel: input.shortLabel,
      billable: input.billable ?? true,
      defaultRateCents: input.defaultRateCents,
      regime: input.regime ?? null,
      partnerId: input.partnerId ?? null,
      active: true,
    },
    select: CLIENT_SELECT,
  });
}

/** Updates every editable field of an existing client, including its active status. */
export function updateClient(
  id: number,
  input: UpdateClientInput,
): Promise<ClientRecord> {
  return prisma.client.update({
    where: { id },
    data: {
      name: input.name,
      shortLabel: input.shortLabel,
      billable: input.billable ?? true,
      active: input.active,
      defaultRateCents: input.defaultRateCents,
      regime: input.regime ?? null,
      partnerId: input.partnerId ?? null,
    },
    select: CLIENT_SELECT,
  });
}

/** The row-level active toggle's target: flips `active` alone. */
export function setClientActive(
  id: number,
  active: boolean,
): Promise<ClientRecord> {
  return prisma.client.update({
    where: { id },
    data: { active },
    select: CLIENT_SELECT,
  });
}

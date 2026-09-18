// The only file for `PortageContract` allowed to import the Prisma client
// (AD-004, `ai-rules/policy_architecture.md` -> Data access). Every function
// here takes and returns `PortageContractRecord`, a plain domain type -
// never a raw Prisma model. `chargeRateBasisPoints` crosses this boundary as
// a plain integer number of basis points (AD-007); the `Rate` conversion to
// and from a decimal percentage string happens at the action/query boundary,
// not here.

import { prisma } from "@/lib/db";

/** The plain domain shape every function in this file returns. */
export type PortageContractRecord = {
  id: number;
  label: string;
  companyName: string;
  chargeRateBasisPoints: number;
  validFrom: Date;
  validTo: Date | null;
  active: boolean;
};

/** The fields `PortageContractRecord` needs - shared by every read and write below. */
const PORTAGE_CONTRACT_SELECT = {
  id: true,
  label: true,
  companyName: true,
  chargeRateBasisPoints: true,
  validFrom: true,
  validTo: true,
  active: true,
} as const;

/**
 * Every portage contract, active and inactive alike, ordered by label.
 * Overlapping validity periods - including two for the same company - are
 * allowed by design (RG-28) and never filtered here. No scoping: V1 is
 * single-operator, nothing to scope by (D-40).
 */
export function listPortageContracts(): Promise<PortageContractRecord[]> {
  return prisma.portageContract.findMany({
    orderBy: { label: "asc" },
    select: PORTAGE_CONTRACT_SELECT,
  });
}

/** Creates a portage contract. Always active on creation (functional spec: "created active by default"). */
export function createPortageContract(data: {
  label: string;
  companyName: string;
  chargeRateBasisPoints: number;
  validFrom: Date;
  validTo: Date | null;
}): Promise<PortageContractRecord> {
  return prisma.portageContract.create({
    data: { ...data, active: true },
    select: PORTAGE_CONTRACT_SELECT,
  });
}

/**
 * Updates a portage contract. Every field, including `chargeRateBasisPoints`
 * and both validity dates, is writable at any time - no field is locked once
 * set (functional spec, step 8).
 */
export function updatePortageContract(
  id: number,
  data: {
    label: string;
    companyName: string;
    chargeRateBasisPoints: number;
    validFrom: Date;
    validTo: Date | null;
  },
): Promise<PortageContractRecord> {
  return prisma.portageContract.update({
    where: { id },
    data,
    select: PORTAGE_CONTRACT_SELECT,
  });
}

/** Sets a portage contract's active status. Deactivate-only in this feature - no hard delete. */
export function setPortageContractActive(
  id: number,
  active: boolean,
): Promise<PortageContractRecord> {
  return prisma.portageContract.update({
    where: { id },
    data: { active },
    select: PORTAGE_CONTRACT_SELECT,
  });
}

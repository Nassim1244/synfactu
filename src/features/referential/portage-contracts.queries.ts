// Read functions for `PortageContract`, called by the `/referential` async
// Server Component (AD-006). Converts each record to its display/form shape
// - `chargeRateBasisPoints` back to a decimal percentage string through
// `Rate` (AD-007), and each `Date` to the `YYYY-MM-DD` form a native
// `<input type="date">` expects - so no Prisma type and no raw basis-point
// integer ever reaches a component.

import * as repository from "./portage-contracts.repository";
import { Rate } from "@/lib/money/rate";

/** The Referential screen's Portage contracts section row/form shape - the reverse of `portageContractSchema`'s parsed shape. */
export type PortageContractView = {
  id: number;
  label: string;
  companyName: string;
  chargeRatePercent: string;
  validFrom: string;
  validTo: string | null;
  active: boolean;
};

/** Renders a UTC `Date` as the `YYYY-MM-DD` string a native `<input type="date">` expects (AD-008). */
function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Every portage contract, active and inactive alike, ordered by label - the
 * Referential screen's Portage contracts section dataset (functional spec,
 * step 6).
 */
export async function listPortageContractsView(): Promise<
  PortageContractView[]
> {
  const contracts = await repository.listPortageContracts();
  return contracts.map((contract) => ({
    id: contract.id,
    label: contract.label,
    companyName: contract.companyName,
    chargeRatePercent: Rate.fromBasisPoints(
      contract.chargeRateBasisPoints,
    ).toPercentDecimalString(),
    validFrom: toDateInputValue(contract.validFrom),
    validTo:
      contract.validTo === null ? null : toDateInputValue(contract.validTo),
    active: contract.active,
  }));
}

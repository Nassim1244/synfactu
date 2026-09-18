// Tests for `src/features/referential/portage-contracts.queries.ts`: the
// display-shape conversion the Referential Server Component (AD-006) relies
// on - basis points back to a decimal percentage string (AD-007), and each
// `Date` to the `YYYY-MM-DD` form a native `<input type="date">` expects.
// The repository is faked - it is the I/O boundary this module sits above,
// not the unit under test (`ai-rules/policy_testing.md` -> Relevance).

import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/referential/portage-contracts.repository");

import { listPortageContractsView } from "@/features/referential/portage-contracts.queries";
import * as repository from "@/features/referential/portage-contracts.repository";

const mockedRepository = vi.mocked(repository);

describe("listPortageContractsView", () => {
  it("converts basis points to a plain decimal percentage string", async () => {
    mockedRepository.listPortageContracts.mockResolvedValue([
      {
        id: 1,
        label: "Contract A",
        companyName: "Portage Co",
        chargeRateBasisPoints: 2460,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validTo: null,
        active: true,
      },
    ]);

    const [view] = await listPortageContractsView();

    expect(view?.chargeRatePercent).toBe("24.60");
  });

  it("renders validFrom as a YYYY-MM-DD string", async () => {
    mockedRepository.listPortageContracts.mockResolvedValue([
      {
        id: 1,
        label: "Contract A",
        companyName: "Portage Co",
        chargeRateBasisPoints: 2460,
        validFrom: new Date("2026-03-15T00:00:00.000Z"),
        validTo: null,
        active: true,
      },
    ]);

    const [view] = await listPortageContractsView();

    expect(view?.validFrom).toBe("2026-03-15");
  });

  it("renders a null validTo as null - open-ended, not a fabricated date", async () => {
    mockedRepository.listPortageContracts.mockResolvedValue([
      {
        id: 1,
        label: "Contract A",
        companyName: "Portage Co",
        chargeRateBasisPoints: 2460,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validTo: null,
        active: true,
      },
    ]);

    const [view] = await listPortageContractsView();

    expect(view?.validTo).toBeNull();
  });

  it("renders an explicit validTo as a YYYY-MM-DD string", async () => {
    mockedRepository.listPortageContracts.mockResolvedValue([
      {
        id: 1,
        label: "Contract A",
        companyName: "Portage Co",
        chargeRateBasisPoints: 2460,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validTo: new Date("2026-12-31T00:00:00.000Z"),
        active: true,
      },
    ]);

    const [view] = await listPortageContractsView();

    expect(view?.validTo).toBe("2026-12-31");
  });

  it("returns an empty list when the repository returns none", async () => {
    mockedRepository.listPortageContracts.mockResolvedValue([]);

    expect(await listPortageContractsView()).toEqual([]);
  });
});

// Tests for `src/features/referential/portage-contracts.actions.ts`.
//
// Per `ai-rules/policy_testing.md` -> What to test where, `actions.ts` is
// tested with the repository faked. What only this level can prove: parsing
// happens before the repository is ever touched, the form's decimal
// `chargeRate` string is converted to exact basis points through `Rate`
// (AD-007) before the repository ever sees it, an unset `validTo` reaches
// the repository as `null` (never `undefined`), and exactly which route
// each action revalidates.
//
// The tests above this comment feed the action a raw, pre-parse payload
// (`validFrom`/`validTo` as `YYYY-MM-DD` strings) - a direct, unvalidated
// invocation, per `policy_security.md` -> Threat model ("assume any Server
// Action can be invoked directly, with arbitrary arguments"), and they pass.
// The "regression" describe block near the end of this file instead feeds
// the action the payload its own real caller,
// `PortageContractFormDialog.tsx`'s `CreatePortageContractForm`/
// `EditPortageContractForm`, actually sends on every normal save: see that
// component test file's own header comment for why `zodResolver` hands
// `handleSubmit` the schema's *parsed* output (`validFrom`/`validTo`
// already `Date`s), not the raw form strings. This action then calls
// `portageContractSchema.parse(input)` again on that already-parsed value -
// but the schema's `validFrom`/`validTo` fields are `z.string()...`, which
// rejects a `Date`. The result: every real save from the Portage contract
// form fails validation and shows "Could not save this portage contract.
// Try again.", even though the user entered nothing wrong. See the handoff
// report for this production defect - not fixed here (`@tester` never
// writes production code).

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/referential/portage-contracts.repository");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";

import {
  createPortageContractAction,
  togglePortageContractActiveAction,
  updatePortageContractAction,
} from "@/features/referential/portage-contracts.actions";
import * as repository from "@/features/referential/portage-contracts.repository";

const mockedRepository = vi.mocked(repository);
const mockedRevalidatePath = vi.mocked(revalidatePath);

const FAKE_CONTRACT = {
  id: 1,
  label: "Contract A",
  companyName: "Portage Co",
  chargeRateBasisPoints: 2460,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null,
  active: true,
};

const validInput = {
  label: "Contract A",
  companyName: "Portage Co",
  chargeRate: "24.60",
  validFrom: "2026-01-01",
  validTo: undefined,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("createPortageContractAction", () => {
  it("converts the decimal charge rate to exact basis points through Rate, never a float", async () => {
    mockedRepository.createPortageContract.mockResolvedValue(FAKE_CONTRACT);

    const result = await createPortageContractAction(validInput as never);

    expect(result).toEqual({ ok: true, data: FAKE_CONTRACT });
    expect(mockedRepository.createPortageContract).toHaveBeenCalledWith({
      label: "Contract A",
      companyName: "Portage Co",
      chargeRateBasisPoints: 2460,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validTo: null,
    });
  });

  it("passes null, not undefined, when no end date is given", async () => {
    mockedRepository.createPortageContract.mockResolvedValue(FAKE_CONTRACT);

    await createPortageContractAction(validInput as never);

    expect(mockedRepository.createPortageContract).toHaveBeenCalledWith(
      expect.objectContaining({ validTo: null }),
    );
  });

  it("revalidates /referential on success", async () => {
    mockedRepository.createPortageContract.mockResolvedValue(FAKE_CONTRACT);

    await createPortageContractAction(validInput as never);

    expect(mockedRevalidatePath).toHaveBeenCalledWith("/referential");
  });

  it.each([
    { ...validInput, label: "" },
    { ...validInput, companyName: "" },
    { ...validInput, chargeRate: "0" },
    { ...validInput, chargeRate: "101" },
    { ...validInput, validFrom: "" },
  ])(
    "rejects an invalid payload %j without calling the repository",
    async (input) => {
      const result = await createPortageContractAction(input as never);

      expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
      expect(mockedRepository.createPortageContract).not.toHaveBeenCalled();
      expect(mockedRevalidatePath).not.toHaveBeenCalled();
    },
  );

  it("rejects an end date earlier than the start date without calling the repository", async () => {
    const result = await createPortageContractAction({
      ...validInput,
      validFrom: "2026-06-01",
      validTo: "2026-05-31",
    } as never);

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.createPortageContract).not.toHaveBeenCalled();
  });

  it("returns SAVE_FAILED, never a raw error, when the repository throws", async () => {
    mockedRepository.createPortageContract.mockRejectedValue(
      new Error("SQLITE_ERROR"),
    );

    const result = await createPortageContractAction(validInput as never);

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
  });
});

describe("updatePortageContractAction", () => {
  it("converts and forwards every field, including an explicit end date", async () => {
    mockedRepository.updatePortageContract.mockResolvedValue(FAKE_CONTRACT);

    await updatePortageContractAction(1, {
      ...validInput,
      validTo: "2026-12-31",
    } as never);

    expect(mockedRepository.updatePortageContract).toHaveBeenCalledWith(1, {
      label: "Contract A",
      companyName: "Portage Co",
      chargeRateBasisPoints: 2460,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validTo: new Date("2026-12-31T00:00:00.000Z"),
    });
  });

  it("allows changing the charge rate on the update path with no lock check", async () => {
    mockedRepository.updatePortageContract.mockResolvedValue(FAKE_CONTRACT);

    await updatePortageContractAction(1, {
      ...validInput,
      chargeRate: "99.99",
    } as never);

    expect(mockedRepository.updatePortageContract).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ chargeRateBasisPoints: 9999 }),
    );
  });

  it.each([0, -1, 1.5])(
    "rejects the invalid id %p without calling the repository",
    async (id) => {
      const result = await updatePortageContractAction(id, validInput as never);

      expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
      expect(mockedRepository.updatePortageContract).not.toHaveBeenCalled();
    },
  );

  it("returns SAVE_FAILED when the repository throws", async () => {
    mockedRepository.updatePortageContract.mockRejectedValue(
      new Error("no such row"),
    );

    const result = await updatePortageContractAction(1, validInput as never);

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
  });
});

describe("createPortageContractAction / updatePortageContractAction - the exact payload the real dialog sends (regression)", () => {
  it("expected: accepts the already-parsed payload CreatePortageContractForm actually submits on save", async () => {
    mockedRepository.createPortageContract.mockResolvedValue(FAKE_CONTRACT);

    // Exactly what `handleSubmit(onSubmit)` calls this action with in the
    // real browser: `validFrom` already a `Date`, `validTo` already
    // `undefined` when the field was left blank - never the raw
    // `YYYY-MM-DD` strings the native `<input type="date">` holds.
    const realDialogPayload = {
      label: "Contract A",
      companyName: "Portage Co",
      chargeRate: "24.60",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validTo: undefined,
    };

    const result = await createPortageContractAction(realDialogPayload);

    expect(result).toEqual({ ok: true, data: FAKE_CONTRACT });
    expect(mockedRepository.createPortageContract).toHaveBeenCalledWith(
      expect.objectContaining({ chargeRateBasisPoints: 2460 }),
    );
  });

  it("expected: accepts the already-parsed payload EditPortageContractForm actually submits on save", async () => {
    mockedRepository.updatePortageContract.mockResolvedValue(FAKE_CONTRACT);

    const realDialogPayload = {
      label: "Contract A",
      companyName: "Portage Co",
      chargeRate: "35",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validTo: new Date("2026-12-31T00:00:00.000Z"),
    };

    const result = await updatePortageContractAction(1, realDialogPayload);

    expect(result).toEqual({ ok: true, data: FAKE_CONTRACT });
    expect(mockedRepository.updatePortageContract).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ chargeRateBasisPoints: 3500 }),
    );
  });
});

describe("togglePortageContractActiveAction", () => {
  it("toggles on valid input, revalidates /referential", async () => {
    mockedRepository.setPortageContractActive.mockResolvedValue({
      ...FAKE_CONTRACT,
      active: false,
    });

    const result = await togglePortageContractActiveAction(1, false);

    expect(result).toEqual({
      ok: true,
      data: { ...FAKE_CONTRACT, active: false },
    });
    expect(mockedRepository.setPortageContractActive).toHaveBeenCalledWith(
      1,
      false,
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/referential");
  });

  it("rejects a non-boolean active flag without calling the repository", async () => {
    const result = await togglePortageContractActiveAction(
      1,
      "true" as unknown as boolean,
    );

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.setPortageContractActive).not.toHaveBeenCalled();
  });

  it("returns SAVE_FAILED when the repository throws", async () => {
    mockedRepository.setPortageContractActive.mockRejectedValue(
      new Error("boom"),
    );

    const result = await togglePortageContractActiveAction(1, false);

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
  });
});

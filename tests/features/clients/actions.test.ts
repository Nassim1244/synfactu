// Tests for `src/features/clients/actions.ts`.
//
// Per `ai-rules/policy_testing.md` -> What to test where, `actions.ts` is
// tested with the repository faked - the happy path's actual persistence is
// proven by `repository.test.ts` (a real database) and by the end-to-end
// journey. What only this level can prove: parsing happens before the
// repository is ever touched, the form's decimal `defaultRate` string is
// converted to exact cents through the real `Money` class before the
// repository sees it, an unknown/invalid `partnerId` (the repository's own FK
// constraint failure) surfaces as the same generic `SAVE_FAILED` code as any
// other post-validation failure - never the raw SQLite message - and exactly
// which route each action revalidates.

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/clients/repository");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";

import { createClient, updateClient } from "@/features/clients/actions";
import * as repository from "@/features/clients/repository";

/** The action's own declared parameter type. */
type CreateClientInput = Parameters<typeof createClient>[0];
type UpdateClientInput = Parameters<typeof updateClient>[0];

const mockedRepository = vi.mocked(repository);
const mockedRevalidatePath = vi.mocked(revalidatePath);

const FAKE_CLIENT = {
  id: 1,
  name: "Acme",
  shortLabel: "ACME",
  billable: true,
  active: true,
  defaultRateCents: 45_050,
  regime: null,
  partnerId: null,
  partner: null,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("createClient", () => {
  const validInput: CreateClientInput = {
    name: "Acme",
    shortLabel: "ACME",
    defaultRate: "450.50",
    billable: true,
  };

  it("converts the decimal rate to exact cents through Money, never a float", async () => {
    mockedRepository.createClient.mockResolvedValue(FAKE_CLIENT);

    const result = await createClient(validInput);

    expect(result).toEqual({ ok: true, data: FAKE_CLIENT });
    expect(mockedRepository.createClient).toHaveBeenCalledWith({
      name: "Acme",
      shortLabel: "ACME",
      billable: true,
      defaultRateCents: 45_050,
      regime: null,
      partnerId: null,
    });
  });

  it("never drifts 0.1 through a float when converting the rate", async () => {
    mockedRepository.createClient.mockResolvedValue(FAKE_CLIENT);

    await createClient({ ...validInput, defaultRate: "0.1" });

    expect(mockedRepository.createClient).toHaveBeenCalledWith(
      expect.objectContaining({ defaultRateCents: 10 }),
    );
  });

  it("revalidates /clients only, never /partners", async () => {
    mockedRepository.createClient.mockResolvedValue(FAKE_CLIENT);

    await createClient(validInput);

    expect(mockedRevalidatePath).toHaveBeenCalledTimes(1);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/clients");
  });

  it("rejects a missing name without calling the repository", async () => {
    const result = await createClient({ ...validInput, name: "" });

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.createClient).not.toHaveBeenCalled();
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a missing short label without calling the repository", async () => {
    const result = await createClient({ ...validInput, shortLabel: "" });

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.createClient).not.toHaveBeenCalled();
  });

  it.each(["0", "-5", "abc", ""])(
    "rejects the non-positive or non-numeric rate %j without calling the repository",
    async (defaultRate) => {
      const result = await createClient({ ...validInput, defaultRate });

      expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
      expect(mockedRepository.createClient).not.toHaveBeenCalled();
    },
  );

  it("defaults billable to true and regime/partnerId to null when omitted from the raw payload", async () => {
    // A Server Action can be invoked directly with arbitrary JSON, not only
    // through this form's own typed call site (`policy_security.md` ->
    // Threat model), so `billable` may genuinely be absent on the wire even
    // though the action's own TS signature - shaped by the schema's already-
    // defaulted output type - always shows it as present.
    mockedRepository.createClient.mockResolvedValue(FAKE_CLIENT);
    const rawPayload = {
      name: "Acme",
      shortLabel: "ACME",
      defaultRate: "450.50",
    };

    await createClient(rawPayload as CreateClientInput);

    expect(mockedRepository.createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        billable: true,
        regime: null,
        partnerId: null,
      }),
    );
  });

  it("returns a stable SAVE_FAILED code for an unknown partnerId, never the FK constraint message", async () => {
    mockedRepository.createClient.mockRejectedValue(
      new Error(
        "Foreign key constraint failed on the field: `clients_partner_id_fkey`",
      ),
    );

    const result = await createClient({ ...validInput, partnerId: 999_999 });

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateClient", () => {
  const validInput: UpdateClientInput = {
    id: 1,
    name: "Acme",
    shortLabel: "ACME",
    defaultRate: "450.50",
    billable: true,
    active: true,
  };

  it("revalidates /clients and its own detail page when partnerId is null", async () => {
    mockedRepository.updateClient.mockResolvedValue(FAKE_CLIENT);

    const result = await updateClient(validInput);

    expect(result).toEqual({ ok: true, data: FAKE_CLIENT });
    expect(mockedRevalidatePath).toHaveBeenCalledTimes(2);
    expect(mockedRevalidatePath).toHaveBeenNthCalledWith(1, "/clients");
    expect(mockedRevalidatePath).toHaveBeenNthCalledWith(2, "/clients/1");
  });

  it("also revalidates the referring partner's detail page when partnerId is set", async () => {
    mockedRepository.updateClient.mockResolvedValue(FAKE_CLIENT);

    await updateClient({ ...validInput, partnerId: 7 });

    expect(mockedRevalidatePath).toHaveBeenCalledTimes(3);
    expect(mockedRevalidatePath).toHaveBeenNthCalledWith(1, "/clients");
    expect(mockedRevalidatePath).toHaveBeenNthCalledWith(2, "/clients/1");
    expect(mockedRevalidatePath).toHaveBeenNthCalledWith(3, "/partners/7");
  });

  it("does not revalidate any partner path when partnerId is explicitly null", async () => {
    mockedRepository.updateClient.mockResolvedValue(FAKE_CLIENT);

    await updateClient({ ...validInput, partnerId: null });

    expect(mockedRevalidatePath).toHaveBeenCalledTimes(2);
    expect(mockedRevalidatePath).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/partners\//),
    );
  });

  it("converts the decimal rate to cents before calling the repository", async () => {
    mockedRepository.updateClient.mockResolvedValue(FAKE_CLIENT);

    await updateClient(validInput);

    expect(mockedRepository.updateClient).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ defaultRateCents: 45_050 }),
    );
  });

  it("rejects a missing active flag without calling the repository", async () => {
    const withoutActive: Record<string, unknown> = { ...validInput };
    delete withoutActive.active;

    const result = await updateClient(withoutActive as UpdateClientInput);

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.updateClient).not.toHaveBeenCalled();
  });

  it("returns SAVE_FAILED for an unknown partnerId, never a raw message", async () => {
    mockedRepository.updateClient.mockRejectedValue(
      new Error("Foreign key constraint failed"),
    );

    const result = await updateClient({ ...validInput, partnerId: 999_999 });

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
  });
});

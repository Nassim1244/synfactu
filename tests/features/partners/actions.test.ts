// Tests for `src/features/partners/actions.ts`.
//
// Per `ai-rules/policy_testing.md` -> What to test where, `actions.ts` is
// tested with the repository faked - the happy path's actual persistence is
// proven by `repository.test.ts` (a real database) and by the end-to-end
// journey. What only this level can prove is the action's own logic: that it
// parses before ever touching the repository, that a validation failure never
// reaches the repository at all, that a repository failure never leaks a raw
// message, and exactly which routes each action revalidates.

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/partners/repository");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";

import { createPartner, updatePartner } from "@/features/partners/actions";
import * as repository from "@/features/partners/repository";

const mockedRepository = vi.mocked(repository);
const mockedRevalidatePath = vi.mocked(revalidatePath);

const FAKE_PARTNER = { id: 1, name: "Acme", active: true };

afterEach(() => {
  vi.clearAllMocks();
});

describe("createPartner", () => {
  it("parses, calls the repository, revalidates /partners, and returns { ok: true }", async () => {
    mockedRepository.createPartner.mockResolvedValue(FAKE_PARTNER);

    const result = await createPartner({ name: "Acme" });

    expect(result).toEqual({ ok: true, data: FAKE_PARTNER });
    expect(mockedRepository.createPartner).toHaveBeenCalledWith({
      name: "Acme",
    });
    expect(mockedRevalidatePath).toHaveBeenCalledTimes(1);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/partners");
  });

  it("rejects an empty name without ever calling the repository", async () => {
    const result = await createPartner({ name: "" });

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.createPartner).not.toHaveBeenCalled();
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns a stable SAVE_FAILED code, never the repository's raw error", async () => {
    mockedRepository.createPartner.mockRejectedValue(
      new Error("SQLITE_CONSTRAINT: some internal detail"),
    );

    const result = await createPartner({ name: "Acme" });

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("updatePartner", () => {
  const validInput = { id: 1, name: "Acme", active: true };

  it("revalidates /partners, its own detail page and /clients, in that order, when no client is linked", async () => {
    mockedRepository.updatePartner.mockResolvedValue(FAKE_PARTNER);
    mockedRepository.listClientIdsByPartner.mockResolvedValue([]);

    const result = await updatePartner(validInput);

    expect(result).toEqual({ ok: true, data: FAKE_PARTNER });
    expect(mockedRepository.updatePartner).toHaveBeenCalledWith(1, {
      name: "Acme",
      active: true,
    });
    expect(mockedRevalidatePath).toHaveBeenCalledTimes(3);
    expect(mockedRevalidatePath).toHaveBeenNthCalledWith(1, "/partners");
    expect(mockedRevalidatePath).toHaveBeenNthCalledWith(2, "/partners/1");
    expect(mockedRevalidatePath).toHaveBeenNthCalledWith(3, "/clients");
  });

  it("also revalidates every currently-linked client's own detail page", async () => {
    mockedRepository.updatePartner.mockResolvedValue(FAKE_PARTNER);
    mockedRepository.listClientIdsByPartner.mockResolvedValue([5, 9]);

    await updatePartner(validInput);

    expect(mockedRepository.listClientIdsByPartner).toHaveBeenCalledWith(1);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/clients/5");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/clients/9");
    expect(mockedRevalidatePath).toHaveBeenCalledTimes(5);
  });

  it("rejects an empty name without calling the repository", async () => {
    const result = await updatePartner({ ...validInput, name: "" });

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.updatePartner).not.toHaveBeenCalled();
  });

  it("rejects a non-positive id without calling the repository", async () => {
    const result = await updatePartner({ ...validInput, id: 0 });

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.updatePartner).not.toHaveBeenCalled();
  });

  it("returns SAVE_FAILED when the repository throws, and does not revalidate", async () => {
    mockedRepository.updatePartner.mockRejectedValue(new Error("boom"));
    mockedRepository.listClientIdsByPartner.mockResolvedValue([]);

    const result = await updatePartner(validInput);

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});

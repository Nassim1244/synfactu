// Tests for `src/features/referential/mission-categories.actions.ts`.
//
// Per `ai-rules/policy_testing.md` -> What to test where, `actions.ts` is
// tested with the repository faked - the happy path's actual persistence is
// proven by `mission-categories.repository.test.ts` and by the end-to-end
// journey. What only this level can prove: parsing happens before the
// repository is ever touched, an unstable/unexpected repository failure
// surfaces as the same generic `SAVE_FAILED` code, and exactly which route
// each action revalidates.

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/referential/mission-categories.repository");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";

import {
  createMissionCategoryAction,
  toggleMissionCategoryActiveAction,
  updateMissionCategoryAction,
} from "@/features/referential/mission-categories.actions";
import * as repository from "@/features/referential/mission-categories.repository";

const mockedRepository = vi.mocked(repository);
const mockedRevalidatePath = vi.mocked(revalidatePath);

const FAKE_CATEGORY = { id: 1, label: "Conseil", active: true };

afterEach(() => {
  vi.clearAllMocks();
});

describe("createMissionCategoryAction", () => {
  it("creates on a valid label, revalidates /referential", async () => {
    mockedRepository.createMissionCategory.mockResolvedValue(FAKE_CATEGORY);

    const result = await createMissionCategoryAction({ label: "Conseil" });

    expect(result).toEqual({ ok: true, data: FAKE_CATEGORY });
    expect(mockedRepository.createMissionCategory).toHaveBeenCalledWith({
      label: "Conseil",
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/referential");
  });

  it("rejects an empty label without calling the repository", async () => {
    const result = await createMissionCategoryAction({ label: "" });

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.createMissionCategory).not.toHaveBeenCalled();
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns SAVE_FAILED, never a raw error, when the repository throws", async () => {
    mockedRepository.createMissionCategory.mockRejectedValue(
      new Error("SQLITE_ERROR"),
    );

    const result = await createMissionCategoryAction({ label: "Conseil" });

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateMissionCategoryAction", () => {
  it("updates on a valid id and label, revalidates /referential", async () => {
    mockedRepository.updateMissionCategory.mockResolvedValue(FAKE_CATEGORY);

    const result = await updateMissionCategoryAction(1, { label: "Conseil" });

    expect(result).toEqual({ ok: true, data: FAKE_CATEGORY });
    expect(mockedRepository.updateMissionCategory).toHaveBeenCalledWith(1, {
      label: "Conseil",
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/referential");
  });

  it.each([0, -1, 1.5])(
    "rejects the invalid id %p without calling the repository",
    async (id) => {
      const result = await updateMissionCategoryAction(id, {
        label: "Conseil",
      });

      expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
      expect(mockedRepository.updateMissionCategory).not.toHaveBeenCalled();
    },
  );

  it("rejects an empty label without calling the repository", async () => {
    const result = await updateMissionCategoryAction(1, { label: "" });

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.updateMissionCategory).not.toHaveBeenCalled();
  });

  it("returns SAVE_FAILED when the repository throws", async () => {
    mockedRepository.updateMissionCategory.mockRejectedValue(
      new Error("no such row"),
    );

    const result = await updateMissionCategoryAction(1, { label: "Conseil" });

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
  });
});

describe("toggleMissionCategoryActiveAction", () => {
  it("toggles on valid input, revalidates /referential", async () => {
    mockedRepository.setMissionCategoryActive.mockResolvedValue({
      ...FAKE_CATEGORY,
      active: false,
    });

    const result = await toggleMissionCategoryActiveAction(1, false);

    expect(result).toEqual({
      ok: true,
      data: { ...FAKE_CATEGORY, active: false },
    });
    expect(mockedRepository.setMissionCategoryActive).toHaveBeenCalledWith(
      1,
      false,
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/referential");
  });

  it("rejects a non-boolean active flag without calling the repository", async () => {
    const result = await toggleMissionCategoryActiveAction(
      1,
      "true" as unknown as boolean,
    );

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.setMissionCategoryActive).not.toHaveBeenCalled();
  });

  it("returns SAVE_FAILED when the repository throws", async () => {
    mockedRepository.setMissionCategoryActive.mockRejectedValue(
      new Error("boom"),
    );

    const result = await toggleMissionCategoryActiveAction(1, false);

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
  });
});

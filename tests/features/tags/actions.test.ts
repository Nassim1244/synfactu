// Tests for `src/features/tags/actions.ts`.
//
// Per `ai-rules/policy_testing.md` -> What to test where, `actions.ts` is
// tested with the repository faked. What only this level can prove: parsing
// happens before the repository is ever touched, `DuplicateTagPathError` and
// `InvalidTagParentError` are translated to their own stable error codes
// rather than the generic `SAVE_FAILED`, and exactly which route each
// action revalidates.

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/tags/repository");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";

import {
  createTagAction,
  renameTagAction,
  toggleTagActiveAction,
} from "@/features/tags/actions";
import * as repository from "@/features/tags/repository";
import {
  DuplicateTagPathError,
  InvalidTagParentError,
  TagNotFoundError,
} from "@/features/tags/repository";

const mockedRepository = vi.mocked(repository);
const mockedRevalidatePath = vi.mocked(revalidatePath);

const FAKE_TAG = {
  id: 1,
  label: "commercial",
  path: "commercial",
  parentId: null,
  active: true,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("createTagAction", () => {
  it("creates a top-level tag when no parentId is given, revalidates /referential", async () => {
    mockedRepository.createTag.mockResolvedValue(FAKE_TAG);

    const result = await createTagAction({ label: "commercial" });

    expect(result).toEqual({ ok: true, data: FAKE_TAG });
    expect(mockedRepository.createTag).toHaveBeenCalledWith({
      label: "commercial",
      parentId: null,
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/referential");
  });

  it("forwards a given parentId", async () => {
    mockedRepository.createTag.mockResolvedValue(FAKE_TAG);

    await createTagAction({ label: "RDV1", parentId: 3 });

    expect(mockedRepository.createTag).toHaveBeenCalledWith({
      label: "RDV1",
      parentId: 3,
    });
  });

  it("rejects an empty label without calling the repository", async () => {
    const result = await createTagAction({ label: "" });

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.createTag).not.toHaveBeenCalled();
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5])(
    "rejects the invalid parentId %p without calling the repository",
    async (parentId) => {
      const result = await createTagAction({ label: "RDV1", parentId });

      expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
      expect(mockedRepository.createTag).not.toHaveBeenCalled();
    },
  );

  it("returns DUPLICATE_PATH when the repository throws DuplicateTagPathError", async () => {
    mockedRepository.createTag.mockRejectedValue(
      new DuplicateTagPathError("a tag with this path already exists"),
    );

    const result = await createTagAction({ label: "commercial" });

    expect(result).toEqual({ ok: false, error: "DUPLICATE_PATH" });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns INVALID_PARENT when the repository throws InvalidTagParentError", async () => {
    mockedRepository.createTag.mockRejectedValue(
      new InvalidTagParentError("parent is not active"),
    );

    const result = await createTagAction({ label: "RDV1", parentId: 3 });

    expect(result).toEqual({ ok: false, error: "INVALID_PARENT" });
  });

  it("returns SAVE_FAILED for any other repository failure", async () => {
    mockedRepository.createTag.mockRejectedValue(new Error("SQLITE_ERROR"));

    const result = await createTagAction({ label: "commercial" });

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
  });
});

describe("renameTagAction", () => {
  it("renames on valid input, revalidates /referential", async () => {
    mockedRepository.renameTag.mockResolvedValue({
      ...FAKE_TAG,
      label: "sales",
      path: "sales",
    });

    const result = await renameTagAction(1, "sales");

    expect(result).toEqual({
      ok: true,
      data: { ...FAKE_TAG, label: "sales", path: "sales" },
    });
    expect(mockedRepository.renameTag).toHaveBeenCalledWith(1, "sales");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/referential");
  });

  it("rejects an empty label without calling the repository", async () => {
    const result = await renameTagAction(1, "");

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.renameTag).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5])(
    "rejects the invalid id %p without calling the repository",
    async (id) => {
      const result = await renameTagAction(id, "sales");

      expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
      expect(mockedRepository.renameTag).not.toHaveBeenCalled();
    },
  );

  it("returns DUPLICATE_PATH when the repository throws DuplicateTagPathError", async () => {
    mockedRepository.renameTag.mockRejectedValue(
      new DuplicateTagPathError("collides with an existing path"),
    );

    const result = await renameTagAction(1, "sales");

    expect(result).toEqual({ ok: false, error: "DUPLICATE_PATH" });
  });

  it("returns SAVE_FAILED, not a raw not-found message, when the repository throws TagNotFoundError", async () => {
    mockedRepository.renameTag.mockRejectedValue(
      new TagNotFoundError("tag does not exist"),
    );

    const result = await renameTagAction(999_999, "sales");

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
  });

  it("returns SAVE_FAILED for any other repository failure", async () => {
    mockedRepository.renameTag.mockRejectedValue(new Error("boom"));

    const result = await renameTagAction(1, "sales");

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
  });
});

describe("toggleTagActiveAction", () => {
  it("toggles on valid input, revalidates /referential", async () => {
    mockedRepository.setTagActive.mockResolvedValue({
      ...FAKE_TAG,
      active: false,
    });

    const result = await toggleTagActiveAction(1, false);

    expect(result).toEqual({ ok: true, data: { ...FAKE_TAG, active: false } });
    expect(mockedRepository.setTagActive).toHaveBeenCalledWith(1, false);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/referential");
  });

  it("rejects a non-boolean active flag without calling the repository", async () => {
    const result = await toggleTagActiveAction(1, "true" as unknown as boolean);

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.setTagActive).not.toHaveBeenCalled();
  });

  it("returns SAVE_FAILED when the repository throws", async () => {
    mockedRepository.setTagActive.mockRejectedValue(new Error("boom"));

    const result = await toggleTagActiveAction(1, false);

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
  });
});

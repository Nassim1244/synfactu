// Tests for `src/features/tags/queries.ts`: `depthOf`, the derivation of a
// tag's position in the hierarchy from its stored `path` (functional spec,
// step 11), and the parent-picker option shape. The repository is faked -
// it is the I/O boundary this module sits above, not the unit under test
// (`ai-rules/policy_testing.md` -> Relevance).

import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/tags/repository");

import {
  listActiveTagsForParentPickerView,
  listTagsView,
} from "@/features/tags/queries";
import * as repository from "@/features/tags/repository";

const mockedRepository = vi.mocked(repository);

describe("listTagsView - depth derivation", () => {
  it("gives a top-level tag a depth of 0", async () => {
    mockedRepository.listTags.mockResolvedValue([
      {
        id: 1,
        label: "commercial",
        path: "commercial",
        parentId: null,
        active: true,
      },
    ]);

    const [view] = await listTagsView();

    expect(view?.depth).toBe(0);
  });

  it("gives a one-level-deep tag a depth of 1", async () => {
    mockedRepository.listTags.mockResolvedValue([
      {
        id: 2,
        label: "RDV1",
        path: "commercial::RDV1",
        parentId: 1,
        active: true,
      },
    ]);

    const [view] = await listTagsView();

    expect(view?.depth).toBe(1);
  });

  it("gives a two-levels-deep tag a depth of 2", async () => {
    mockedRepository.listTags.mockResolvedValue([
      {
        id: 3,
        label: "Sub",
        path: "commercial::RDV1::Sub",
        parentId: 2,
        active: true,
      },
    ]);

    const [view] = await listTagsView();

    expect(view?.depth).toBe(2);
  });

  it("carries the id, label, path, parentId and active status through unchanged", async () => {
    mockedRepository.listTags.mockResolvedValue([
      {
        id: 2,
        label: "RDV1",
        path: "commercial::RDV1",
        parentId: 1,
        active: false,
      },
    ]);

    const [view] = await listTagsView();

    expect(view).toEqual({
      id: 2,
      label: "RDV1",
      path: "commercial::RDV1",
      parentId: 1,
      depth: 1,
      active: false,
    });
  });

  it("returns an empty list when the repository returns none", async () => {
    mockedRepository.listTags.mockResolvedValue([]);

    expect(await listTagsView()).toEqual([]);
  });
});

describe("listActiveTagsForParentPickerView", () => {
  it("maps each active tag to its id and path only", async () => {
    mockedRepository.listActiveTagsForParentPicker.mockResolvedValue([
      {
        id: 1,
        label: "commercial",
        path: "commercial",
        parentId: null,
        active: true,
      },
    ]);

    const options = await listActiveTagsForParentPickerView();

    expect(options).toEqual([{ id: 1, path: "commercial" }]);
  });

  it("returns an empty list when no active tag exists", async () => {
    mockedRepository.listActiveTagsForParentPicker.mockResolvedValue([]);

    expect(await listActiveTagsForParentPickerView()).toEqual([]);
  });
});

// Tests for `src/features/tags/components/TagFormDialog.tsx` (design
// v01-004). The Server Action boundary (`../actions`) is mocked; `tagSchema`
// / `renameTagLabelSchema` are real, since the field-local validation they
// drive is exactly what this dialog is responsible for wiring correctly.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/tags/actions");

import { TagFormDialog } from "@/features/tags/components/TagFormDialog";
import * as actions from "@/features/tags/actions";
import { installRadixPolyfills } from "../../../support/radixPolyfills";

installRadixPolyfills();

const mockedActions = vi.mocked(actions);

const ACTIVE_TAG_OPTIONS = [
  { id: 1, path: "commercial" },
  { id: 2, path: "support" },
];

const FAKE_TAG = {
  id: 3,
  label: "RDV1",
  path: "commercial::RDV1",
  parentId: 1,
  active: true,
};

afterEach(() => {
  vi.clearAllMocks();
});

async function openCreateDialog(user: ReturnType<typeof userEvent.setup>) {
  render(
    <TagFormDialog
      mode="create"
      activeTagOptions={ACTIVE_TAG_OPTIONS}
      trigger={<button>New tag</button>}
    />,
  );
  await user.click(screen.getByRole("button", { name: "New tag" }));
}

describe("TagFormDialog - create mode", () => {
  it("opens with the title 'New tag', 'None' selected by default and a blank label", async () => {
    const user = userEvent.setup();
    await openCreateDialog(user);

    expect(
      screen.getByRole("heading", { name: "New tag" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Parent tag" }),
    ).toHaveTextContent("None (top-level tag)");
    expect(screen.getByLabelText("Label")).toHaveValue("");
  });

  it("offers exactly the given active tag options in the parent picker", async () => {
    const user = userEvent.setup();
    await openCreateDialog(user);

    await user.click(screen.getByRole("combobox", { name: "Parent tag" }));

    const listbox = await screen.findByRole("listbox");
    expect(
      within(listbox).getByText("None (top-level tag)"),
    ).toBeInTheDocument();
    expect(within(listbox).getByText("commercial")).toBeInTheDocument();
    expect(within(listbox).getByText("support")).toBeInTheDocument();
  });

  it("rejects an empty label without calling the action", async () => {
    const user = userEvent.setup();
    await openCreateDialog(user);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Label is required.")).toBeInTheDocument();
    expect(mockedActions.createTagAction).not.toHaveBeenCalled();
  });

  it("creates a top-level tag with no parent selected", async () => {
    const user = userEvent.setup();
    mockedActions.createTagAction.mockResolvedValue({
      ok: true,
      data: {
        id: 4,
        label: "alpha",
        path: "alpha",
        parentId: null,
        active: true,
      },
    });
    await openCreateDialog(user);

    await user.type(screen.getByLabelText("Label"), "alpha");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.createTagAction).toHaveBeenCalledWith({
      label: "alpha",
      parentId: undefined,
    });
  });

  it("creates a child tag under the selected active parent", async () => {
    const user = userEvent.setup();
    mockedActions.createTagAction.mockResolvedValue({
      ok: true,
      data: FAKE_TAG,
    });
    await openCreateDialog(user);

    await user.click(screen.getByRole("combobox", { name: "Parent tag" }));
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("commercial"));
    await user.type(screen.getByLabelText("Label"), "RDV1");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.createTagAction).toHaveBeenCalledWith({
      label: "RDV1",
      parentId: 1,
    });
  });

  it("surfaces a duplicate-path failure as a field error on the label", async () => {
    const user = userEvent.setup();
    mockedActions.createTagAction.mockResolvedValue({
      ok: false,
      error: "DUPLICATE_PATH",
    });
    await openCreateDialog(user);

    await user.type(screen.getByLabelText("Label"), "commercial");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(
        "A tag with this label already exists under this parent.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a generic Alert for any other save failure", async () => {
    const user = userEvent.setup();
    mockedActions.createTagAction.mockResolvedValue({
      ok: false,
      error: "SAVE_FAILED",
    });
    await openCreateDialog(user);

    await user.type(screen.getByLabelText("Label"), "alpha");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Could not save this tag. Try again."),
    ).toBeInTheDocument();
  });
});

describe("TagFormDialog - edit mode", () => {
  const tag = {
    id: 2,
    label: "RDV1",
    path: "commercial::RDV1",
    parentId: 1,
    depth: 1,
    active: true,
  };

  it("pre-fills the label and shows the parent as read-only text", async () => {
    const user = userEvent.setup();
    render(
      <TagFormDialog
        mode="edit"
        tag={tag}
        parentPath="commercial"
        trigger={<button>Edit RDV1</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit RDV1" }));

    expect(
      screen.getByRole("heading", { name: "Edit tag RDV1" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Label")).toHaveValue("RDV1");
    expect(screen.getByText("commercial")).toBeInTheDocument();
  });

  it("shows the top-level placeholder when the tag has no parent", async () => {
    const user = userEvent.setup();
    render(
      <TagFormDialog
        mode="edit"
        tag={{ ...tag, parentId: null }}
        parentPath={null}
        trigger={<button>Edit RDV1</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit RDV1" }));

    expect(screen.getByText("— (top-level tag)")).toBeInTheDocument();
  });

  it("offers no control to change the parent - no re-parenting in V1", async () => {
    const user = userEvent.setup();
    render(
      <TagFormDialog
        mode="edit"
        tag={tag}
        parentPath="commercial"
        trigger={<button>Edit RDV1</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit RDV1" }));

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("rejects clearing the label to empty", async () => {
    const user = userEvent.setup();
    render(
      <TagFormDialog
        mode="edit"
        tag={tag}
        parentPath="commercial"
        trigger={<button>Edit RDV1</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit RDV1" }));

    await user.clear(screen.getByLabelText("Label"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Label is required.")).toBeInTheDocument();
    expect(mockedActions.renameTagAction).not.toHaveBeenCalled();
  });

  it("renames the tag through renameTagAction with its id and the new label", async () => {
    const user = userEvent.setup();
    mockedActions.renameTagAction.mockResolvedValue({
      ok: true,
      data: { ...tag, label: "RDV1bis", path: "commercial::RDV1bis" },
    });
    render(
      <TagFormDialog
        mode="edit"
        tag={tag}
        parentPath="commercial"
        trigger={<button>Edit RDV1</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit RDV1" }));

    await user.clear(screen.getByLabelText("Label"));
    await user.type(screen.getByLabelText("Label"), "RDV1bis");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.renameTagAction).toHaveBeenCalledWith(2, "RDV1bis");
  });

  it("surfaces a duplicate-path failure as a field error on the label", async () => {
    const user = userEvent.setup();
    mockedActions.renameTagAction.mockResolvedValue({
      ok: false,
      error: "DUPLICATE_PATH",
    });
    render(
      <TagFormDialog
        mode="edit"
        tag={tag}
        parentPath="commercial"
        trigger={<button>Edit RDV1</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit RDV1" }));

    await user.clear(screen.getByLabelText("Label"));
    await user.type(screen.getByLabelText("Label"), "support");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(
        "A tag with this label already exists under this parent.",
      ),
    ).toBeInTheDocument();
  });

  it("has no delete control anywhere in the dialog", async () => {
    const user = userEvent.setup();
    render(
      <TagFormDialog
        mode="edit"
        tag={tag}
        parentPath="commercial"
        trigger={<button>Edit RDV1</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit RDV1" }));

    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
  });
});

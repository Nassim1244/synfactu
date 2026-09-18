// Tests for
// `src/features/referential/components/mission-categories/MissionCategoryFormDialog.tsx`
// (design v01-004). The Server Action boundary (`../../mission-categories.actions`)
// is mocked; `missionCategorySchema` is real, since the field-local
// validation it drives is exactly what this dialog is responsible for
// wiring correctly.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/referential/mission-categories.actions");

import { MissionCategoryFormDialog } from "@/features/referential/components/mission-categories/MissionCategoryFormDialog";
import * as actions from "@/features/referential/mission-categories.actions";
import { installRadixPolyfills } from "../../../../support/radixPolyfills";

installRadixPolyfills();

const mockedActions = vi.mocked(actions);

afterEach(() => {
  vi.clearAllMocks();
});

async function openCreateDialog(user: ReturnType<typeof userEvent.setup>) {
  render(
    <MissionCategoryFormDialog
      mode="create"
      trigger={<button>New mission category</button>}
    />,
  );
  await user.click(
    screen.getByRole("button", { name: "New mission category" }),
  );
}

describe("MissionCategoryFormDialog - create mode", () => {
  it("opens with the title 'New mission category' and a blank label", async () => {
    const user = userEvent.setup();
    await openCreateDialog(user);

    expect(
      screen.getByRole("heading", { name: "New mission category" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Label")).toHaveValue("");
  });

  it("rejects an empty label with 'Label is required.' and never calls the action", async () => {
    const user = userEvent.setup();
    await openCreateDialog(user);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Label")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Label is required.")).toBeInTheDocument();
    expect(mockedActions.createMissionCategoryAction).not.toHaveBeenCalled();
  });

  it("creates the category on a valid label", async () => {
    const user = userEvent.setup();
    mockedActions.createMissionCategoryAction.mockResolvedValue({
      ok: true,
      data: { id: 1, label: "Formation interne", active: true },
    });
    await openCreateDialog(user);

    await user.type(screen.getByLabelText("Label"), "Formation interne");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.createMissionCategoryAction).toHaveBeenCalledWith({
      label: "Formation interne",
    });
  });

  it("closes the dialog after a successful save", async () => {
    const user = userEvent.setup();
    mockedActions.createMissionCategoryAction.mockResolvedValue({
      ok: true,
      data: { id: 1, label: "Formation interne", active: true },
    });
    await openCreateDialog(user);
    await user.type(screen.getByLabelText("Label"), "Formation interne");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.queryByRole("heading", { name: "New mission category" }),
    ).not.toBeInTheDocument();
  });

  it("shows an Alert and keeps the dialog open when the save fails", async () => {
    const user = userEvent.setup();
    mockedActions.createMissionCategoryAction.mockResolvedValue({
      ok: false,
      error: "SAVE_FAILED",
    });
    await openCreateDialog(user);
    await user.type(screen.getByLabelText("Label"), "Formation interne");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(
        "Could not save this mission category. Try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Label")).toHaveValue("Formation interne");
  });
});

describe("MissionCategoryFormDialog - edit mode", () => {
  const category = { id: 5, label: "Conseil", active: true };

  it("pre-fills the label from the record and titles the dialog with it", async () => {
    const user = userEvent.setup();
    render(
      <MissionCategoryFormDialog
        mode="edit"
        category={category}
        trigger={<button>Edit Conseil</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit Conseil" }));

    expect(
      screen.getByRole("heading", { name: "Edit mission category Conseil" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Label")).toHaveValue("Conseil");
  });

  it("rejects clearing the label to empty", async () => {
    const user = userEvent.setup();
    render(
      <MissionCategoryFormDialog
        mode="edit"
        category={category}
        trigger={<button>Edit Conseil</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit Conseil" }));

    await user.clear(screen.getByLabelText("Label"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Label is required.")).toBeInTheDocument();
    expect(mockedActions.updateMissionCategoryAction).not.toHaveBeenCalled();
  });

  it("submits the new label to updateMissionCategoryAction with the record's id", async () => {
    const user = userEvent.setup();
    mockedActions.updateMissionCategoryAction.mockResolvedValue({
      ok: true,
      data: { ...category, label: "Conseil senior" },
    });
    render(
      <MissionCategoryFormDialog
        mode="edit"
        category={category}
        trigger={<button>Edit Conseil</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit Conseil" }));

    await user.clear(screen.getByLabelText("Label"));
    await user.type(screen.getByLabelText("Label"), "Conseil senior");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.updateMissionCategoryAction).toHaveBeenCalledWith(5, {
      label: "Conseil senior",
    });
  });

  it("has no delete control anywhere in the dialog", async () => {
    const user = userEvent.setup();
    render(
      <MissionCategoryFormDialog
        mode="edit"
        category={category}
        trigger={<button>Edit Conseil</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit Conseil" }));

    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
  });
});

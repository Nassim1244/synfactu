// Tests for `src/features/settings/components/AppSettingsEditForm.tsx`
// (design `design/v01/v01-003/`, "Edit application settings"). The Server
// Action boundary (`../actions`) is mocked - the dialog's own logic
// (pre-fill, validation timing, the fixed rounding-direction display, the
// coefficient toggle, submit wiring) is the unit under test, not the
// network round trip.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/settings/actions");

import { AppSettingsEditForm } from "@/features/settings/components/AppSettingsEditForm";
import * as actions from "@/features/settings/actions";
import type { AppSettingsView } from "@/features/settings/queries";
import { installRadixPolyfills } from "../../../support/radixPolyfills";

installRadixPolyfills();

const mockedActions = vi.mocked(actions);

const DEFAULT_SETTINGS: AppSettingsView = {
  hoursPerDay: "7.00",
  roundingStepMinutes: 15,
  invoiceNumberPattern: "YYYY-MM-NNN_Client_mission",
  showMissionCoefficient: false,
  microEstimatedChargeRate: "25.00",
  roundingDirection: "up",
};

afterEach(() => {
  vi.clearAllMocks();
});

async function openDialog(
  user: ReturnType<typeof userEvent.setup>,
  settings: AppSettingsView = DEFAULT_SETTINGS,
) {
  render(
    <AppSettingsEditForm settings={settings} trigger={<button>Open</button>} />,
  );
  await user.click(screen.getByRole("button", { name: "Open" }));
}

describe("AppSettingsEditForm - pre-fill from the current settings", () => {
  it("opens with the title 'Edit application settings' and every current value pre-filled", async () => {
    const user = userEvent.setup();
    await openDialog(user);

    expect(
      screen.getByRole("heading", { name: "Edit application settings" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Hours per working day")).toHaveValue(7);
    expect(screen.getByLabelText("Rounding step (minutes)")).toHaveValue(15);
    expect(screen.getByLabelText("Invoice numbering pattern")).toHaveValue(
      "YYYY-MM-NNN_Client_mission",
    );
    expect(
      screen.getByRole("switch", {
        name: "Show the mission time-adjustment coefficient elsewhere in the product",
      }),
    ).not.toBeChecked();
    expect(
      screen.getByLabelText("Estimated micro-entreprise charge rate (%)"),
    ).toHaveValue(25);
  });

  it("pre-fills a checked coefficient switch when it is currently on", async () => {
    const user = userEvent.setup();
    await openDialog(user, {
      ...DEFAULT_SETTINGS,
      showMissionCoefficient: true,
    });

    expect(
      screen.getByRole("switch", {
        name: "Show the mission time-adjustment coefficient elsewhere in the product",
      }),
    ).toBeChecked();
  });
});

describe("AppSettingsEditForm - rounding direction has no editable control (D-05)", () => {
  it("shows the fixed value as a disabled, read-only field, both before and after other edits", async () => {
    const user = userEvent.setup();
    await openDialog(user);

    const roundingDirectionField = screen.getByLabelText("Rounding direction");
    expect(roundingDirectionField).toHaveValue("Always up");
    expect(roundingDirectionField).toBeDisabled();

    // Editing an unrelated field leaves it exactly as it was.
    await user.clear(screen.getByLabelText("Hours per working day"));
    await user.type(screen.getByLabelText("Hours per working day"), "8");

    expect(screen.getByLabelText("Rounding direction")).toHaveValue(
      "Always up",
    );
    expect(screen.getByLabelText("Rounding direction")).toBeDisabled();
  });
});

describe("AppSettingsEditForm - hoursPerDay validation", () => {
  it.each(["0", "-1", "abc"])(
    "rejects %j with 'Must be a positive number.' without calling the action",
    async (hoursPerDay) => {
      const user = userEvent.setup();
      await openDialog(user);
      await user.clear(screen.getByLabelText("Hours per working day"));
      await user.type(
        screen.getByLabelText("Hours per working day"),
        hoursPerDay,
      );

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(
        screen.getByText("Must be a positive number."),
      ).toBeInTheDocument();
      expect(mockedActions.updateAppSettings).not.toHaveBeenCalled();
    },
  );
});

describe("AppSettingsEditForm - roundingStepMinutes validation", () => {
  // "1.5" is deliberately not exercised here: the field's native `step="1"`
  // attribute makes a real browser (and jsdom, which implements the same
  // constraint-validation algorithm) refuse to submit the form at all for a
  // non-integer value, before this component's own `onSubmit` ever runs -
  // the same rejection `appSettingsFormSchema`'s own test already proves at
  // the schema level, independent of any DOM behaviour.
  it.each(["0", "-1"])(
    "rejects %j with 'Must be a positive whole number.' without calling the action",
    async (roundingStepMinutes) => {
      const user = userEvent.setup();
      await openDialog(user);
      await user.clear(screen.getByLabelText("Rounding step (minutes)"));
      await user.type(
        screen.getByLabelText("Rounding step (minutes)"),
        roundingStepMinutes,
      );

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(
        screen.getByText("Must be a positive whole number."),
      ).toBeInTheDocument();
      expect(mockedActions.updateAppSettings).not.toHaveBeenCalled();
    },
  );
});

describe("AppSettingsEditForm - invoiceNumberPattern validation", () => {
  it("rejects an emptied pattern without calling the action", async () => {
    const user = userEvent.setup();
    await openDialog(user);
    await user.clear(screen.getByLabelText("Invoice numbering pattern"));

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText("Invoice numbering pattern is required."),
    ).toBeInTheDocument();
    expect(mockedActions.updateAppSettings).not.toHaveBeenCalled();
  });
});

describe("AppSettingsEditForm - microEstimatedChargeRate validation", () => {
  it.each(["abc", "-5", "150", "100.01"])(
    "rejects %j with 'Must be a number between 0 and 100.' without calling the action",
    async (microEstimatedChargeRate) => {
      const user = userEvent.setup();
      await openDialog(user);
      await user.clear(
        screen.getByLabelText("Estimated micro-entreprise charge rate (%)"),
      );
      await user.type(
        screen.getByLabelText("Estimated micro-entreprise charge rate (%)"),
        microEstimatedChargeRate,
      );

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(
        screen.getByText("Must be a number between 0 and 100."),
      ).toBeInTheDocument();
      expect(mockedActions.updateAppSettings).not.toHaveBeenCalled();
    },
  );
});

describe("AppSettingsEditForm - coefficient toggle round trip", () => {
  it("saves with the toggle switched on from an initial off state", async () => {
    const user = userEvent.setup();
    mockedActions.updateAppSettings.mockResolvedValue({
      ok: true,
      data: {} as never,
    });
    await openDialog(user, {
      ...DEFAULT_SETTINGS,
      showMissionCoefficient: false,
    });

    await user.click(
      screen.getByRole("switch", {
        name: "Show the mission time-adjustment coefficient elsewhere in the product",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.updateAppSettings).toHaveBeenCalledWith(
      expect.objectContaining({ showMissionCoefficient: true }),
    );
  });

  it("saves with the toggle switched off from an initial on state", async () => {
    const user = userEvent.setup();
    mockedActions.updateAppSettings.mockResolvedValue({
      ok: true,
      data: {} as never,
    });
    await openDialog(user, {
      ...DEFAULT_SETTINGS,
      showMissionCoefficient: true,
    });

    await user.click(
      screen.getByRole("switch", {
        name: "Show the mission time-adjustment coefficient elsewhere in the product",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.updateAppSettings).toHaveBeenCalledWith(
      expect.objectContaining({ showMissionCoefficient: false }),
    );
  });
});

describe("AppSettingsEditForm - successful save", () => {
  it("saves every editable field and closes the dialog", async () => {
    const user = userEvent.setup();
    mockedActions.updateAppSettings.mockResolvedValue({
      ok: true,
      data: {} as never,
    });
    await openDialog(user);
    await user.clear(screen.getByLabelText("Hours per working day"));
    await user.type(screen.getByLabelText("Hours per working day"), "8");
    await user.clear(screen.getByLabelText("Invoice numbering pattern"));
    await user.type(
      screen.getByLabelText("Invoice numbering pattern"),
      "CUSTOM-NNN",
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.updateAppSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        hoursPerDay: "8",
        roundingStepMinutes: 15,
        invoiceNumberPattern: "CUSTOM-NNN",
        showMissionCoefficient: false,
        microEstimatedChargeRate: "25.00",
      }),
    );
    await screen.findByRole("button", { name: "Open" });
    expect(
      screen.queryByRole("heading", { name: "Edit application settings" }),
    ).not.toBeInTheDocument();
  });
});

describe("AppSettingsEditForm - save failure", () => {
  it("keeps the dialog open with entered data intact and shows an Alert", async () => {
    const user = userEvent.setup();
    mockedActions.updateAppSettings.mockResolvedValue({
      ok: false,
      error: "SAVE_FAILED",
    });
    await openDialog(user);
    await user.clear(screen.getByLabelText("Invoice numbering pattern"));
    await user.type(
      screen.getByLabelText("Invoice numbering pattern"),
      "CUSTOM-NNN",
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(
        "Could not save the application settings. Try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Invoice numbering pattern")).toHaveValue(
      "CUSTOM-NNN",
    );
    expect(
      screen.getByRole("heading", { name: "Edit application settings" }),
    ).toBeInTheDocument();
  });
});

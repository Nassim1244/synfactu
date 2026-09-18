// The application-settings edit dialog (design `design/v01/v01-003/`, "Edit
// application settings"): hours per working day, the rounding step, the
// invoice numbering pattern, the coefficient-display toggle and the
// estimated micro-entreprise charge rate, opened from `SettingsView`'s
// "Edit" action. The rounding direction is shown read-only ("Always up")
// and is not a control on this form - D-05 fixes it and the user never
// enters it (functional spec, step 6).
//
// "use client": it owns the dialog's open state and the form's field
// values, validation and pending state
// (`ai-rules/policy_coding_guidelines.md` -> React and Next idioms).

"use client";

import { useId, useState, type JSX, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { updateAppSettings } from "../actions";
import { appSettingsFormSchema, type AppSettingsForm } from "../schema";
import type { AppSettingsView } from "../queries";

/**
 * The edit form itself, re-mounted (via `key`, see the dialog below) every
 * time the dialog opens so its defaults always reflect the latest saved
 * settings.
 */
function EditAppSettingsForm({
  settings,
  onSaved,
  onCancel,
}: {
  settings: AppSettingsView;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AppSettingsForm>({
    resolver: zodResolver(appSettingsFormSchema),
    defaultValues: {
      hoursPerDay: settings.hoursPerDay,
      roundingStepMinutes: settings.roundingStepMinutes,
      invoiceNumberPattern: settings.invoiceNumberPattern,
      showMissionCoefficient: settings.showMissionCoefficient,
      microEstimatedChargeRate: settings.microEstimatedChargeRate,
    },
  });

  const [formError, setFormError] = useState<string | null>(null);

  const hoursPerDayId = useId();
  const hoursPerDayErrorId = useId();
  const roundingStepMinutesId = useId();
  const roundingStepMinutesErrorId = useId();
  const roundingDirectionId = useId();
  const invoiceNumberPatternId = useId();
  const invoiceNumberPatternErrorId = useId();
  const showMissionCoefficientId = useId();
  const microEstimatedChargeRateId = useId();
  const microEstimatedChargeRateErrorId = useId();

  async function onSubmit(values: AppSettingsForm): Promise<void> {
    setFormError(null);
    const result = await updateAppSettings(values);
    if (result.ok) {
      onSaved();
    } else {
      setFormError("Could not save the application settings. Try again.");
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={hoursPerDayId}>Hours per working day</Label>
        <Input
          id={hoursPerDayId}
          type="number"
          step="0.01"
          {...register("hoursPerDay")}
          aria-invalid={errors.hoursPerDay !== undefined}
          aria-describedby={
            errors.hoursPerDay !== undefined ? hoursPerDayErrorId : undefined
          }
        />
        {errors.hoursPerDay !== undefined && (
          <p id={hoursPerDayErrorId} className="text-destructive text-sm">
            {errors.hoursPerDay.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={roundingStepMinutesId}>Rounding step (minutes)</Label>
        <Input
          id={roundingStepMinutesId}
          type="number"
          step="1"
          {...register("roundingStepMinutes", { valueAsNumber: true })}
          aria-invalid={errors.roundingStepMinutes !== undefined}
          aria-describedby={
            errors.roundingStepMinutes !== undefined
              ? roundingStepMinutesErrorId
              : undefined
          }
        />
        {errors.roundingStepMinutes !== undefined && (
          <p
            id={roundingStepMinutesErrorId}
            className="text-destructive text-sm"
          >
            {errors.roundingStepMinutes.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={roundingDirectionId}>Rounding direction</Label>
        <Input id={roundingDirectionId} value="Always up" disabled readOnly />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={invoiceNumberPatternId}>
          Invoice numbering pattern
        </Label>
        <Input
          id={invoiceNumberPatternId}
          className="font-mono"
          {...register("invoiceNumberPattern")}
          aria-invalid={errors.invoiceNumberPattern !== undefined}
          aria-describedby={
            errors.invoiceNumberPattern !== undefined
              ? invoiceNumberPatternErrorId
              : undefined
          }
        />
        {errors.invoiceNumberPattern !== undefined && (
          <p
            id={invoiceNumberPatternErrorId}
            className="text-destructive text-sm"
          >
            {errors.invoiceNumberPattern.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="showMissionCoefficient"
          render={({ field }) => (
            <Switch
              id={showMissionCoefficientId}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor={showMissionCoefficientId}>
          Show the mission time-adjustment coefficient elsewhere in the product
        </Label>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={microEstimatedChargeRateId}>
          Estimated micro-entreprise charge rate (%)
        </Label>
        <Input
          id={microEstimatedChargeRateId}
          type="number"
          step="0.01"
          {...register("microEstimatedChargeRate")}
          aria-invalid={errors.microEstimatedChargeRate !== undefined}
          aria-describedby={
            errors.microEstimatedChargeRate !== undefined
              ? microEstimatedChargeRateErrorId
              : undefined
          }
        />
        {errors.microEstimatedChargeRate !== undefined && (
          <p
            id={microEstimatedChargeRateErrorId}
            className="text-destructive text-sm"
          >
            {errors.microEstimatedChargeRate.message}
          </p>
        )}
      </div>

      {formError !== null && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * The application-settings edit dialog.
 *
 * @param props.settings every current setting, already loaded by the
 * `/settings` Server Component - no fetch happens in this component.
 * @param props.trigger the element that opens the dialog - the Application
 * settings section's "Edit" button - rendered via `DialogTrigger asChild` so
 * the call site controls its own accessible name.
 * @returns the trigger wrapped with the dialog it opens.
 */
export function AppSettingsEditForm({
  settings,
  trigger,
}: {
  settings: AppSettingsView;
  trigger: ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(false);

  function handleSaved(): void {
    setOpen(false);
  }

  function handleCancel(): void {
    setOpen(false);
  }

  // Keying on `open` forces the form to remount - and so to recompute its
  // `useForm` defaults from the current settings - every time the dialog
  // opens, matching the codebase's existing edit-dialog convention (see
  // `PartnerFormDialog`).
  const formKey = open ? "open" : "closed";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit application settings</DialogTitle>
        </DialogHeader>
        <EditAppSettingsForm
          key={formKey}
          settings={settings}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}

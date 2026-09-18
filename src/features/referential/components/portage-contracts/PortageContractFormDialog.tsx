// The portage contract create/edit dialog (design v01-004 prototype: one
// shared dialog, retextured per entity, 520px wide for the contract's extra
// fields). A single exported component covers both modes: `mode: "create"`
// renders the blank form the section's "New portage contract" button opens;
// `mode: "edit"` renders it pre-filled from the row already loaded in
// `PortageContractList` - no separate fetch on open. The row's own
// active/inactive status is toggled by `ActiveToggle`, not by this dialog:
// `updatePortageContractAction` does not accept it
// (`portage-contracts.schema.ts`), matching the functional spec's separate
// edit (step 8) and deactivate/reactivate (step 10) flows.
//
// "use client": it owns the dialog's open state and, inside each form, the
// field values, validation and pending state of the save
// (`ai-rules/policy_coding_guidelines.md` -> React and Next idioms).

"use client";

import {
  useId,
  useRef,
  useState,
  type JSX,
  type ReactNode,
  type RefObject,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

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

import {
  createPortageContractAction,
  updatePortageContractAction,
} from "../../portage-contracts.actions";
import {
  portageContractSchema,
  type PortageContractInput,
} from "../../portage-contracts.schema";
import type { listPortageContractsView } from "../../portage-contracts.queries";

/** One row of `listPortageContractsView()`'s result - the shape this dialog pre-fills from in edit mode. */
type PortageContractRecord = Awaited<
  ReturnType<typeof listPortageContractsView>
>[number];

type PortageContractFormDialogProps =
  | { mode: "create"; trigger: ReactNode }
  | { mode: "edit"; contract: PortageContractRecord; trigger: ReactNode };

/**
 * The raw, pre-parse shape `portageContractSchema` accepts - `chargeRate`,
 * `validFrom` and `validTo` are all still form strings here, matched to what
 * a native `<input>` submits, unlike `PortageContractInput` (`z.infer`, the
 * post-parse output the Server Action expects, with the two dates already
 * `Date` objects).
 */
type PortageContractFormValues = z.input<typeof portageContractSchema>;

/**
 * The create-mode form: every contract field, validated against
 * `portageContractSchema` (the same schema `createPortageContractAction`
 * parses, AD-005).
 */
function CreatePortageContractForm({
  labelInputRef,
  onSaved,
  onCancel,
}: {
  labelInputRef: RefObject<HTMLInputElement | null>;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PortageContractFormValues, unknown, PortageContractInput>({
    resolver: zodResolver(portageContractSchema),
    defaultValues: {
      label: "",
      companyName: "",
      chargeRate: "",
      validFrom: "",
      validTo: "",
    },
  });

  const labelId = useId();
  const labelErrorId = useId();
  const companyId = useId();
  const companyErrorId = useId();
  const rateId = useId();
  const rateErrorId = useId();
  const startId = useId();
  const startErrorId = useId();
  const endId = useId();
  const endErrorId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const { ref: registerLabelRef, ...labelField } = register("label");

  async function onSubmit(values: PortageContractInput): Promise<void> {
    setFormError(null);
    const result = await createPortageContractAction(values);
    if (result.ok) {
      onSaved();
    } else {
      setFormError("Could not save this portage contract. Try again.");
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
        <Label htmlFor={labelId}>Label</Label>
        <Input
          id={labelId}
          {...labelField}
          ref={(element) => {
            registerLabelRef(element);
            labelInputRef.current = element;
          }}
          aria-invalid={errors.label !== undefined}
          aria-describedby={
            errors.label !== undefined ? labelErrorId : undefined
          }
        />
        {errors.label !== undefined && (
          <p id={labelErrorId} className="text-destructive text-sm">
            {errors.label.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={companyId}>Company name</Label>
        <Input
          id={companyId}
          {...register("companyName")}
          aria-invalid={errors.companyName !== undefined}
          aria-describedby={
            errors.companyName !== undefined ? companyErrorId : undefined
          }
        />
        {errors.companyName !== undefined && (
          <p id={companyErrorId} className="text-destructive text-sm">
            {errors.companyName.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={rateId}>Charge rate (%)</Label>
        <Input
          id={rateId}
          type="number"
          step="0.01"
          {...register("chargeRate")}
          aria-invalid={errors.chargeRate !== undefined}
          aria-describedby={
            errors.chargeRate !== undefined ? rateErrorId : undefined
          }
        />
        {errors.chargeRate !== undefined && (
          <p id={rateErrorId} className="text-destructive text-sm">
            {errors.chargeRate.message}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor={startId}>Valid from</Label>
          <Input
            id={startId}
            type="date"
            {...register("validFrom")}
            aria-invalid={errors.validFrom !== undefined}
            aria-describedby={
              errors.validFrom !== undefined ? startErrorId : undefined
            }
          />
          {errors.validFrom !== undefined && (
            <p id={startErrorId} className="text-destructive text-sm">
              {errors.validFrom.message}
            </p>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor={endId}>Valid until (optional)</Label>
          <Input
            id={endId}
            type="date"
            {...register("validTo")}
            aria-invalid={errors.validTo !== undefined}
            aria-describedby={
              errors.validTo !== undefined ? endErrorId : undefined
            }
          />
          {errors.validTo !== undefined && (
            <p id={endErrorId} className="text-destructive text-sm">
              {errors.validTo.message}
            </p>
          )}
        </div>
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
 * The edit-mode form: every contract field, validated against
 * `portageContractSchema` (the same schema `updatePortageContractAction`
 * parses, AD-005). Every field, including the charge rate and both validity
 * dates, is editable at any time - no field is locked once set (functional
 * spec, step 8).
 */
function EditPortageContractForm({
  contract,
  labelInputRef,
  onSaved,
  onCancel,
}: {
  contract: PortageContractRecord;
  labelInputRef: RefObject<HTMLInputElement | null>;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PortageContractFormValues, unknown, PortageContractInput>({
    resolver: zodResolver(portageContractSchema),
    defaultValues: {
      label: contract.label,
      companyName: contract.companyName,
      chargeRate: contract.chargeRatePercent,
      validFrom: contract.validFrom,
      validTo: contract.validTo ?? "",
    },
  });

  const labelId = useId();
  const labelErrorId = useId();
  const companyId = useId();
  const companyErrorId = useId();
  const rateId = useId();
  const rateErrorId = useId();
  const startId = useId();
  const startErrorId = useId();
  const endId = useId();
  const endErrorId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const { ref: registerLabelRef, ...labelField } = register("label");

  async function onSubmit(values: PortageContractInput): Promise<void> {
    setFormError(null);
    const result = await updatePortageContractAction(contract.id, values);
    if (result.ok) {
      onSaved();
    } else {
      setFormError("Could not save this portage contract. Try again.");
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
        <Label htmlFor={labelId}>Label</Label>
        <Input
          id={labelId}
          {...labelField}
          ref={(element) => {
            registerLabelRef(element);
            labelInputRef.current = element;
          }}
          aria-invalid={errors.label !== undefined}
          aria-describedby={
            errors.label !== undefined ? labelErrorId : undefined
          }
        />
        {errors.label !== undefined && (
          <p id={labelErrorId} className="text-destructive text-sm">
            {errors.label.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={companyId}>Company name</Label>
        <Input
          id={companyId}
          {...register("companyName")}
          aria-invalid={errors.companyName !== undefined}
          aria-describedby={
            errors.companyName !== undefined ? companyErrorId : undefined
          }
        />
        {errors.companyName !== undefined && (
          <p id={companyErrorId} className="text-destructive text-sm">
            {errors.companyName.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={rateId}>Charge rate (%)</Label>
        <Input
          id={rateId}
          type="number"
          step="0.01"
          {...register("chargeRate")}
          aria-invalid={errors.chargeRate !== undefined}
          aria-describedby={
            errors.chargeRate !== undefined ? rateErrorId : undefined
          }
        />
        {errors.chargeRate !== undefined && (
          <p id={rateErrorId} className="text-destructive text-sm">
            {errors.chargeRate.message}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor={startId}>Valid from</Label>
          <Input
            id={startId}
            type="date"
            {...register("validFrom")}
            aria-invalid={errors.validFrom !== undefined}
            aria-describedby={
              errors.validFrom !== undefined ? startErrorId : undefined
            }
          />
          {errors.validFrom !== undefined && (
            <p id={startErrorId} className="text-destructive text-sm">
              {errors.validFrom.message}
            </p>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor={endId}>Valid until (optional)</Label>
          <Input
            id={endId}
            type="date"
            {...register("validTo")}
            aria-invalid={errors.validTo !== undefined}
            aria-describedby={
              errors.validTo !== undefined ? endErrorId : undefined
            }
          />
          {errors.validTo !== undefined && (
            <p id={endErrorId} className="text-destructive text-sm">
              {errors.validTo.message}
            </p>
          )}
        </div>
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
 * The portage contract create/edit dialog.
 *
 * @param props `{ mode: "create", trigger }` or
 * `{ mode: "edit", contract, trigger }`. `trigger` is the element that opens
 * the dialog - the section's "New portage contract" button or a row's
 * "Edit" button - rendered via `DialogTrigger asChild` so each call site
 * controls its own accessible name.
 * @returns the trigger wrapped with the dialog it opens.
 */
export function PortageContractFormDialog(
  props: PortageContractFormDialogProps,
): JSX.Element {
  const { mode, trigger } = props;
  const [open, setOpen] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);

  function handleSaved(): void {
    setOpen(false);
  }

  function handleCancel(): void {
    setOpen(false);
  }

  const formKey = open ? "open" : "closed";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          labelInputRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "New portage contract"
              : `Edit portage contract ${props.contract.label}`}
          </DialogTitle>
        </DialogHeader>
        {mode === "create" ? (
          <CreatePortageContractForm
            key={formKey}
            labelInputRef={labelInputRef}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        ) : (
          <EditPortageContractForm
            key={`${props.contract.id}-${formKey}`}
            contract={props.contract}
            labelInputRef={labelInputRef}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

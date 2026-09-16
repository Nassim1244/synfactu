// The partner create/edit dialog (design v01-001, screen 3). A single
// exported component covers both modes: `mode: "create"` renders the blank
// form the page's "New partner" button and the list's empty-state CTA both
// open; `mode: "edit"` renders it pre-filled from the row already loaded in
// `PartnerList` - no separate fetch on open. Each mode is backed by its own
// internal form component so `react-hook-form`'s `useForm` can be typed
// directly against the schema the corresponding Server Action parses
// (`ai-rules/policy_coding_guidelines.md` -> Forms), rather than one hook
// juggling two shapes.
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

import { createPartner, updatePartner } from "../actions";
import {
  createPartnerSchema,
  updatePartnerSchema,
  type CreatePartner,
  type UpdatePartner,
} from "../schema";
import type { listPartners } from "../queries";

/** One row of `listPartners()`'s result - the shape this dialog pre-fills from in edit mode. */
type PartnerRecord = Awaited<ReturnType<typeof listPartners>>[number];

type PartnerFormDialogProps =
  | { mode: "create"; trigger: ReactNode }
  | { mode: "edit"; partner: PartnerRecord; trigger: ReactNode };

/**
 * The create-mode form: `name` only, validated against `createPartnerSchema`
 * (the same schema `createPartner` parses, AD-005).
 */
function CreatePartnerForm({
  nameInputRef,
  onSaved,
  onCancel,
}: {
  nameInputRef: RefObject<HTMLInputElement | null>;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreatePartner>({
    resolver: zodResolver(createPartnerSchema),
    defaultValues: { name: "" },
  });

  const nameId = useId();
  const nameErrorId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const { ref: registerNameRef, ...nameField } = register("name");

  async function onSubmit(values: CreatePartner): Promise<void> {
    setFormError(null);
    const result = await createPartner(values);
    if (result.ok) {
      onSaved();
    } else {
      setFormError("Could not save this partner. Try again.");
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
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          {...nameField}
          ref={(element) => {
            registerNameRef(element);
            nameInputRef.current = element;
          }}
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name !== undefined ? nameErrorId : undefined}
        />
        {errors.name !== undefined && (
          <p id={nameErrorId} className="text-destructive text-sm">
            {errors.name.message}
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
 * The edit-mode form: `id`, `name` and `active`, validated against
 * `updatePartnerSchema` (the same schema `updatePartner` parses, AD-005).
 */
function EditPartnerForm({
  partner,
  nameInputRef,
  onSaved,
  onCancel,
}: {
  partner: PartnerRecord;
  nameInputRef: RefObject<HTMLInputElement | null>;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePartner>({
    resolver: zodResolver(updatePartnerSchema),
    defaultValues: {
      id: partner.id,
      name: partner.name,
      active: partner.active,
    },
  });

  const nameId = useId();
  const nameErrorId = useId();
  const activeId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const { ref: registerNameRef, ...nameField } = register("name");

  async function onSubmit(values: UpdatePartner): Promise<void> {
    setFormError(null);
    const result = await updatePartner(values);
    if (result.ok) {
      onSaved();
    } else {
      setFormError("Could not save this partner. Try again.");
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" {...register("id", { valueAsNumber: true })} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          {...nameField}
          ref={(element) => {
            registerNameRef(element);
            nameInputRef.current = element;
          }}
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name !== undefined ? nameErrorId : undefined}
        />
        {errors.name !== undefined && (
          <p id={nameErrorId} className="text-destructive text-sm">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <Switch
              id={activeId}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor={activeId}>Active</Label>
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
 * The partner create/edit dialog.
 *
 * @param props `{ mode: "create", trigger }` or
 * `{ mode: "edit", partner, trigger }`. `trigger` is the element that opens
 * the dialog - a "New partner" button, an empty-state CTA, or a row's "Edit"
 * button - rendered via `DialogTrigger asChild` so each call site controls
 * its own accessible name.
 * @returns the trigger wrapped with the dialog it opens.
 */
export function PartnerFormDialog(props: PartnerFormDialogProps): JSX.Element {
  const { mode, trigger } = props;
  const [open, setOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function handleSaved(): void {
    setOpen(false);
  }

  function handleCancel(): void {
    setOpen(false);
  }

  // Keying the inner form on `open` forces it to remount - and so to
  // recompute its `useForm` defaults from the current props - every time the
  // dialog opens, matching the design's "re-initialises the form... every
  // time the dialog opens, and clears it on close" without hand-rolled reset
  // bookkeeping. While a save is pending or has failed after validation, the
  // dialog stays open and the key does not change, so entered values survive
  // exactly as the design requires.
  const formKey = open ? "open" : "closed";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(event) => {
          // Focuses the Name field specifically (design: "Autofocus on
          // open"), via Radix's own open-autofocus hook rather than the
          // native `autoFocus` HTML attribute, which
          // `eslint-plugin-jsx-a11y` flags unconditionally.
          event.preventDefault();
          nameInputRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "New partner"
              : `Edit partner ${props.partner.name}`}
          </DialogTitle>
        </DialogHeader>
        {mode === "create" ? (
          <CreatePartnerForm
            key={formKey}
            nameInputRef={nameInputRef}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        ) : (
          <EditPartnerForm
            key={`${props.partner.id}-${formKey}`}
            partner={props.partner}
            nameInputRef={nameInputRef}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

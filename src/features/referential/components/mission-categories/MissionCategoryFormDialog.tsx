// The mission category create/edit dialog (design v01-004 prototype: one
// shared dialog, retextured per entity). A single exported component covers
// both modes: `mode: "create"` renders the blank form the section's "New
// mission category" button opens; `mode: "edit"` renders it pre-filled from
// the row already loaded in `MissionCategoryList` - no separate fetch on
// open. The row's own active/inactive status is toggled by
// `ActiveToggle`, not by this dialog: `updateMissionCategoryAction` does not
// accept it (`mission-categories.schema.ts`), matching the functional
// spec's separate edit (step 4) and deactivate/reactivate (step 5) flows.
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
  createMissionCategoryAction,
  updateMissionCategoryAction,
} from "../../mission-categories.actions";
import {
  missionCategorySchema,
  type MissionCategoryInput,
} from "../../mission-categories.schema";
import type { listMissionCategoriesView } from "../../mission-categories.queries";

/** One row of `listMissionCategoriesView()`'s result - the shape this dialog pre-fills from in edit mode. */
type MissionCategoryRecord = Awaited<
  ReturnType<typeof listMissionCategoriesView>
>[number];

type MissionCategoryFormDialogProps =
  | { mode: "create"; trigger: ReactNode }
  | { mode: "edit"; category: MissionCategoryRecord; trigger: ReactNode };

/**
 * The create-mode form: `label` only, validated against
 * `missionCategorySchema` (the same schema `createMissionCategoryAction`
 * parses, AD-005).
 */
function CreateMissionCategoryForm({
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
  } = useForm<MissionCategoryInput>({
    resolver: zodResolver(missionCategorySchema),
    defaultValues: { label: "" },
  });

  const labelId = useId();
  const labelErrorId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const { ref: registerLabelRef, ...labelField } = register("label");

  async function onSubmit(values: MissionCategoryInput): Promise<void> {
    setFormError(null);
    const result = await createMissionCategoryAction(values);
    if (result.ok) {
      onSaved();
    } else {
      setFormError("Could not save this mission category. Try again.");
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
 * The edit-mode form: `label` only, validated against
 * `missionCategorySchema` (the same schema `updateMissionCategoryAction`
 * parses, AD-005).
 */
function EditMissionCategoryForm({
  category,
  labelInputRef,
  onSaved,
  onCancel,
}: {
  category: MissionCategoryRecord;
  labelInputRef: RefObject<HTMLInputElement | null>;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MissionCategoryInput>({
    resolver: zodResolver(missionCategorySchema),
    defaultValues: { label: category.label },
  });

  const labelId = useId();
  const labelErrorId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const { ref: registerLabelRef, ...labelField } = register("label");

  async function onSubmit(values: MissionCategoryInput): Promise<void> {
    setFormError(null);
    const result = await updateMissionCategoryAction(category.id, values);
    if (result.ok) {
      onSaved();
    } else {
      setFormError("Could not save this mission category. Try again.");
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
 * The mission category create/edit dialog.
 *
 * @param props `{ mode: "create", trigger }` or
 * `{ mode: "edit", category, trigger }`. `trigger` is the element that opens
 * the dialog - the section's "New mission category" button or a row's
 * "Edit" button - rendered via `DialogTrigger asChild` so each call site
 * controls its own accessible name.
 * @returns the trigger wrapped with the dialog it opens.
 */
export function MissionCategoryFormDialog(
  props: MissionCategoryFormDialogProps,
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

  // Keying the inner form on `open` forces it to remount - and so to
  // recompute its `useForm` defaults from the current props - every time the
  // dialog opens, matching every other create/edit dialog in this codebase
  // (e.g. `PartnerFormDialog`).
  const formKey = open ? "open" : "closed";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          labelInputRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "New mission category"
              : `Edit mission category ${props.category.label}`}
          </DialogTitle>
        </DialogHeader>
        {mode === "create" ? (
          <CreateMissionCategoryForm
            key={formKey}
            labelInputRef={labelInputRef}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        ) : (
          <EditMissionCategoryForm
            key={`${props.category.id}-${formKey}`}
            category={props.category}
            labelInputRef={labelInputRef}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

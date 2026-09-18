// The tag create/edit dialog (design v01-004 prototype: one shared dialog,
// retextured per entity; parent picker on create only, read-only parent on
// edit - no re-parenting control in V1, functional spec step 13). A single
// exported component covers both modes: `mode: "create"` renders the blank
// form, with the parent-selection control offering only active tags
// (functional spec, step 12); `mode: "edit"` renders it pre-filled with the
// tag's current label and its parent shown as read-only text - no separate
// fetch on open. The row's own active/inactive status is toggled by
// `ActiveToggle`, not by this dialog: `renameTagAction` does not accept it
// (`schema.ts`), matching the functional spec's separate rename (step 13)
// and deactivate/reactivate (step 14) flows.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createTagAction, renameTagAction } from "../actions";
import {
  renameTagLabelSchema,
  tagSchema,
  type RenameTagLabelInput,
  type TagInput,
} from "../schema";
import type { ActiveTagOption, listTagsView } from "../queries";

/** One row of `listTagsView()`'s result - the shape this dialog pre-fills from in edit mode. */
type TagRecord = Awaited<ReturnType<typeof listTagsView>>[number];

type TagFormDialogProps =
  | {
      mode: "create";
      activeTagOptions: readonly ActiveTagOption[];
      trigger: ReactNode;
    }
  | {
      mode: "edit";
      tag: TagRecord;
      parentPath: string | null;
      trigger: ReactNode;
    };

/** The "None" sentinel the parent-picker `Select` uses, since Radix rejects an empty-string item value. */
const NONE_OPTION = "none";

/**
 * The create-mode form: an optional parent (default: none, a top-level tag)
 * and a label, validated against `tagSchema` (the same schema
 * `createTagAction` parses, AD-005). A duplicate-path failure from the
 * server is surfaced as a field error on `label`
 * (`policy_security.md` -> Input validation: "the server re-validates
 * rather than trusting the client").
 */
function CreateTagForm({
  activeTagOptions,
  labelInputRef,
  onSaved,
  onCancel,
}: {
  activeTagOptions: readonly ActiveTagOption[];
  labelInputRef: RefObject<HTMLInputElement | null>;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TagInput>({
    resolver: zodResolver(tagSchema),
    defaultValues: { label: "", parentId: undefined },
  });

  const parentSelectId = useId();
  const labelId = useId();
  const labelErrorId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const { ref: registerLabelRef, ...labelField } = register("label");

  async function onSubmit(values: TagInput): Promise<void> {
    setFormError(null);
    const result = await createTagAction(values);
    if (result.ok) {
      onSaved();
      return;
    }
    if (result.error === "DUPLICATE_PATH") {
      setError("label", {
        message: "A tag with this label already exists under this parent.",
      });
      return;
    }
    setFormError("Could not save this tag. Try again.");
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={parentSelectId}>Parent tag</Label>
        <Controller
          control={control}
          name="parentId"
          render={({ field }) => (
            <Select
              value={
                field.value !== undefined ? String(field.value) : NONE_OPTION
              }
              onValueChange={(value) => {
                field.onChange(
                  value === NONE_OPTION ? undefined : Number(value),
                );
              }}
            >
              <SelectTrigger id={parentSelectId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_OPTION}>
                  None (top-level tag)
                </SelectItem>
                {activeTagOptions.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

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
 * The edit-mode form: the label only, validated against
 * `z.object({ label })` (the same shape `renameTagAction` parses, AD-005).
 * The parent is shown as read-only text - no control changes it, since
 * re-parenting is out of scope in V1 (functional spec, step 13).
 */
function EditTagForm({
  tag,
  parentPath,
  labelInputRef,
  onSaved,
  onCancel,
}: {
  tag: TagRecord;
  parentPath: string | null;
  labelInputRef: RefObject<HTMLInputElement | null>;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RenameTagLabelInput>({
    resolver: zodResolver(renameTagLabelSchema),
    defaultValues: { label: tag.label },
  });

  const labelId = useId();
  const labelErrorId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const { ref: registerLabelRef, ...labelField } = register("label");

  async function onSubmit(values: RenameTagLabelInput): Promise<void> {
    setFormError(null);
    const result = await renameTagAction(tag.id, values.label);
    if (result.ok) {
      onSaved();
      return;
    }
    if (result.error === "DUPLICATE_PATH") {
      setError("label", {
        message: "A tag with this label already exists under this parent.",
      });
      return;
    }
    setFormError("Could not save this tag. Try again.");
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-sm font-medium">
          Parent tag
        </span>
        <span className="bg-muted rounded-lg px-2.5 py-1.5 text-sm">
          {parentPath ?? "— (top-level tag)"}
        </span>
      </div>

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
 * The tag create/edit dialog.
 *
 * @param props `{ mode: "create", activeTagOptions, trigger }` or
 * `{ mode: "edit", tag, parentPath, trigger }`. `trigger` is the element
 * that opens the dialog - the section's "New tag" button or a row's "Edit"
 * button - rendered via `DialogTrigger asChild` so each call site controls
 * its own accessible name.
 * @returns the trigger wrapped with the dialog it opens.
 */
export function TagFormDialog(props: TagFormDialogProps): JSX.Element {
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
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          labelInputRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New tag" : `Edit tag ${props.tag.label}`}
          </DialogTitle>
        </DialogHeader>
        {mode === "create" ? (
          <CreateTagForm
            key={formKey}
            activeTagOptions={props.activeTagOptions}
            labelInputRef={labelInputRef}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        ) : (
          <EditTagForm
            key={`${props.tag.id}-${formKey}`}
            tag={props.tag}
            parentPath={props.parentPath}
            labelInputRef={labelInputRef}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

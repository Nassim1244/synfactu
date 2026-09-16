// The client create/edit dialog (design v01-001, screen 5). A single
// exported component covers both modes: `mode: "create"` renders the blank,
// defaulted form the page's "New client" button and the list's empty-state
// CTA both open; `mode: "edit"` renders it pre-filled from the row already
// loaded in `ClientList` - no separate fetch on open. Each mode is backed by
// its own internal form component so `react-hook-form`'s `useForm` can be
// typed directly against the schema the corresponding Server Action parses
// (`ai-rules/policy_coding_guidelines.md` -> Forms), rather than one hook
// juggling two shapes.
//
// "use client": it owns the dialog's open state and, inside each form, every
// field value, the short-label pristine/dirty tracking and the pending/error
// state of the save (`ai-rules/policy_coding_guidelines.md` -> React and Next
// idioms).

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Money } from "@/lib/money/money";

import { createClient, updateClient } from "../actions";
import { deriveShortLabel } from "../domain";
import {
  createClientSchema,
  updateClientSchema,
  type CreateClient,
  type UpdateClient,
} from "../schema";
import type { listClients } from "../queries";
import type { listActivePartners } from "@/features/partners/queries";

/** One row of `listClients()`'s result - the shape this dialog pre-fills from in edit mode. */
type ClientRecord = Awaited<ReturnType<typeof listClients>>[number];

/** One row of `listActivePartners()`'s result - the referring-partner `Select`'s option list. */
type ActivePartner = Awaited<ReturnType<typeof listActivePartners>>[number];

type ClientFormDialogProps =
  | {
      mode: "create";
      activePartners: readonly ActivePartner[];
      trigger: ReactNode;
    }
  | {
      mode: "edit";
      client: ClientRecord;
      activePartners: readonly ActivePartner[];
      trigger: ReactNode;
    };

/** The "None" sentinel both optional `Select`s use, since Radix rejects an empty-string item value. */
const NONE_OPTION = "none";

/**
 * The raw, pre-parse shape `createClientSchema` accepts - `billable` is
 * optional here (`z.boolean().optional().default(true)`), unlike `CreateClient`
 * (`z.infer`, the post-`default` output the Server Action expects). `useForm`
 * is typed against this input shape so an unfilled `billable` is legitimately
 * `undefined` while the user is still filling the form, with `handleSubmit`'s
 * third generic below carrying the resolved `CreateClient` output through to
 * `onSubmit`.
 */
type CreateClientFormValues = z.input<typeof createClientSchema>;

/** Same reasoning as `CreateClientFormValues`, for `updateClientSchema`/`UpdateClient`. */
type EditClientFormValues = z.input<typeof updateClientSchema>;

/**
 * The create-mode form: every client field except `active` (always created
 * active), validated against `createClientSchema` (the same schema
 * `createClient` parses, AD-005).
 */
function CreateClientForm({
  activePartners,
  nameInputRef,
  onSaved,
  onCancel,
}: {
  activePartners: readonly ActivePartner[];
  nameInputRef: RefObject<HTMLInputElement | null>;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientFormValues, unknown, CreateClient>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: "",
      shortLabel: "",
      defaultRate: "",
      billable: true,
      regime: null,
      partnerId: null,
    },
  });

  // While pristine (untouched since the dialog opened, or still equal to the
  // value the suggestion engine last derived), every Name keystroke
  // re-derives the Short label live. The moment the user types directly into
  // Short label, it becomes dirty and Name stops overwriting it (design's
  // Interaction detail -> "Short-label auto-suggestion").
  const isShortLabelDirty = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nameId = useId();
  const nameErrorId = useId();
  const shortLabelId = useId();
  const shortLabelErrorId = useId();
  const defaultRateId = useId();
  const defaultRateErrorId = useId();
  const billableId = useId();
  const partnerIdSelectId = useId();
  const regimeSelectId = useId();

  const {
    ref: registerNameRef,
    onChange: registerNameOnChange,
    ...nameField
  } = register("name");
  const { onChange: registerShortLabelOnChange, ...shortLabelField } =
    register("shortLabel");

  async function onSubmit(values: CreateClient): Promise<void> {
    setFormError(null);
    const result = await createClient(values);
    if (result.ok) {
      onSaved();
    } else {
      setFormError("Could not save this client. Try again.");
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
          onChange={(event) => {
            void registerNameOnChange(event);
            if (!isShortLabelDirty.current) {
              setValue("shortLabel", deriveShortLabel(event.target.value), {
                shouldValidate: errors.shortLabel !== undefined,
              });
            }
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={shortLabelId}>Short label</Label>
        <Input
          id={shortLabelId}
          {...shortLabelField}
          onChange={(event) => {
            isShortLabelDirty.current = true;
            void registerShortLabelOnChange(event);
          }}
          aria-invalid={errors.shortLabel !== undefined}
          aria-describedby={
            errors.shortLabel !== undefined ? shortLabelErrorId : undefined
          }
        />
        {errors.shortLabel !== undefined && (
          <p id={shortLabelErrorId} className="text-destructive text-sm">
            {errors.shortLabel.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={defaultRateId}>Default rate (TJM)</Label>
        <Input
          id={defaultRateId}
          type="number"
          step="0.01"
          {...register("defaultRate")}
          aria-invalid={errors.defaultRate !== undefined}
          aria-describedby={
            errors.defaultRate !== undefined ? defaultRateErrorId : undefined
          }
        />
        {errors.defaultRate !== undefined && (
          <p id={defaultRateErrorId} className="text-destructive text-sm">
            {errors.defaultRate.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="billable"
          render={({ field }) => (
            <Switch
              id={billableId}
              checked={field.value ?? true}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor={billableId}>Billable</Label>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={partnerIdSelectId}>Referring partner</Label>
        <Controller
          control={control}
          name="partnerId"
          render={({ field }) => (
            <Select
              value={field.value != null ? String(field.value) : NONE_OPTION}
              onValueChange={(value) => {
                field.onChange(value === NONE_OPTION ? null : Number(value));
              }}
            >
              <SelectTrigger id={partnerIdSelectId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_OPTION}>None</SelectItem>
                {activePartners.map((partner) => (
                  <SelectItem key={partner.id} value={String(partner.id)}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={regimeSelectId}>Default regime</Label>
        <Controller
          control={control}
          name="regime"
          render={({ field }) => (
            <Select
              value={field.value ?? NONE_OPTION}
              onValueChange={(value) => {
                field.onChange(value === NONE_OPTION ? null : value);
              }}
            >
              <SelectTrigger id={regimeSelectId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_OPTION}>None</SelectItem>
                <SelectItem value="MICRO">Micro</SelectItem>
                <SelectItem value="PORTAGE">Portage</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
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
 * The edit-mode form: every client field including `active`, validated
 * against `updateClientSchema` (the same schema `updateClient` parses,
 * AD-005).
 */
function EditClientForm({
  client,
  activePartners,
  nameInputRef,
  onSaved,
  onCancel,
}: {
  client: ClientRecord;
  activePartners: readonly ActivePartner[];
  nameInputRef: RefObject<HTMLInputElement | null>;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditClientFormValues, unknown, UpdateClient>({
    resolver: zodResolver(updateClientSchema),
    defaultValues: {
      id: client.id,
      name: client.name,
      shortLabel: client.shortLabel,
      defaultRate: Money.fromCents(client.defaultRateCents).toDecimalString(),
      billable: client.billable,
      active: client.active,
      regime: client.regime,
      partnerId: client.partnerId,
    },
  });

  const isShortLabelDirty = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nameId = useId();
  const nameErrorId = useId();
  const shortLabelId = useId();
  const shortLabelErrorId = useId();
  const defaultRateId = useId();
  const defaultRateErrorId = useId();
  const billableId = useId();
  const partnerIdSelectId = useId();
  const regimeSelectId = useId();

  const {
    ref: registerNameRef,
    onChange: registerNameOnChange,
    ...nameField
  } = register("name");
  const { onChange: registerShortLabelOnChange, ...shortLabelField } =
    register("shortLabel");

  // An existing link to a partner that has since been deactivated still
  // shows that partner's name (design screen 5): it is not among
  // `activePartners`, so it needs its own option in addition to the active
  // list, or the `Select` would show nothing selected.
  const linkedPartner = client.partner;
  const isLinkedPartnerInactive =
    linkedPartner !== null &&
    !activePartners.some((partner) => partner.id === linkedPartner.id);

  async function onSubmit(values: UpdateClient): Promise<void> {
    setFormError(null);
    const result = await updateClient(values);
    if (result.ok) {
      onSaved();
    } else {
      setFormError("Could not save this client. Try again.");
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
          onChange={(event) => {
            void registerNameOnChange(event);
            if (!isShortLabelDirty.current) {
              setValue("shortLabel", deriveShortLabel(event.target.value), {
                shouldValidate: errors.shortLabel !== undefined,
              });
            }
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={shortLabelId}>Short label</Label>
        <Input
          id={shortLabelId}
          {...shortLabelField}
          onChange={(event) => {
            isShortLabelDirty.current = true;
            void registerShortLabelOnChange(event);
          }}
          aria-invalid={errors.shortLabel !== undefined}
          aria-describedby={
            errors.shortLabel !== undefined ? shortLabelErrorId : undefined
          }
        />
        {errors.shortLabel !== undefined && (
          <p id={shortLabelErrorId} className="text-destructive text-sm">
            {errors.shortLabel.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={defaultRateId}>Default rate (TJM)</Label>
        <Input
          id={defaultRateId}
          type="number"
          step="0.01"
          {...register("defaultRate")}
          aria-invalid={errors.defaultRate !== undefined}
          aria-describedby={
            errors.defaultRate !== undefined ? defaultRateErrorId : undefined
          }
        />
        {errors.defaultRate !== undefined && (
          <p id={defaultRateErrorId} className="text-destructive text-sm">
            {errors.defaultRate.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="billable"
          render={({ field }) => (
            <Switch
              id={billableId}
              checked={field.value ?? true}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor={billableId}>Billable</Label>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={partnerIdSelectId}>Referring partner</Label>
        <Controller
          control={control}
          name="partnerId"
          render={({ field }) => (
            <Select
              value={field.value != null ? String(field.value) : NONE_OPTION}
              onValueChange={(value) => {
                field.onChange(value === NONE_OPTION ? null : Number(value));
              }}
            >
              <SelectTrigger id={partnerIdSelectId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_OPTION}>None</SelectItem>
                {isLinkedPartnerInactive && linkedPartner !== null && (
                  <SelectItem value={String(linkedPartner.id)}>
                    {`${linkedPartner.name} (inactive)`}
                  </SelectItem>
                )}
                {activePartners.map((partner) => (
                  <SelectItem key={partner.id} value={String(partner.id)}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={regimeSelectId}>Default regime</Label>
        <Controller
          control={control}
          name="regime"
          render={({ field }) => (
            <Select
              value={field.value ?? NONE_OPTION}
              onValueChange={(value) => {
                field.onChange(value === NONE_OPTION ? null : value);
              }}
            >
              <SelectTrigger id={regimeSelectId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_OPTION}>None</SelectItem>
                <SelectItem value="MICRO">Micro</SelectItem>
                <SelectItem value="PORTAGE">Portage</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
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
 * The client create/edit dialog.
 *
 * @param props `{ mode: "create", activePartners, trigger }` or
 * `{ mode: "edit", client, activePartners, trigger }`. `activePartners`
 * feeds the referring-partner `Select`'s option list for a fresh link
 * (design screen 5); it is fetched once by the `/clients` Server Component
 * and threaded down, never fetched by this component itself (AD-006).
 * @returns the trigger wrapped with the dialog it opens.
 */
export function ClientFormDialog(props: ClientFormDialogProps): JSX.Element {
  const { mode, trigger, activePartners } = props;
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
        className="sm:max-w-md"
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
              ? "New client"
              : `Edit client ${props.client.name}`}
          </DialogTitle>
        </DialogHeader>
        {mode === "create" ? (
          <CreateClientForm
            key={formKey}
            activePartners={activePartners}
            nameInputRef={nameInputRef}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        ) : (
          <EditClientForm
            key={`${props.client.id}-${formKey}`}
            client={props.client}
            activePartners={activePartners}
            nameInputRef={nameInputRef}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// The company-profile edit dialog (design `design/v01/v01-003/`, "Edit
// company profile"): legal/trading name, SIRET, street, postal code, city,
// contact email and contact phone, opened from `SettingsView`'s "Edit"
// action. There is no create mode - `CompanyProfile` is a single,
// always-addressable row; every field starts empty until the first save
// (AD-031), and this same form edits it the first time and every time after
// (functional spec, steps 3-4).
//
// "use client": it owns the dialog's open state and the form's field values,
// validation and pending state (`ai-rules/policy_coding_guidelines.md` ->
// React and Next idioms).

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

import { updateCompanyProfile } from "../actions";
import { companyProfileSchema, type CompanyProfileInput } from "../schema";
import type { CompanyProfileRecord } from "../repository";

/**
 * The edit form itself, re-mounted (via `key`, see the dialog below) every
 * time the dialog opens so its defaults always reflect the latest saved
 * profile.
 */
function EditCompanyProfileForm({
  profile,
  legalNameInputRef,
  onSaved,
  onCancel,
}: {
  profile: CompanyProfileRecord;
  legalNameInputRef: RefObject<HTMLInputElement | null>;
  onSaved: () => void;
  onCancel: () => void;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyProfileInput>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      legalName: profile.legalName ?? "",
      siret: profile.siret ?? "",
      street: profile.street ?? "",
      postalCode: profile.postalCode ?? "",
      city: profile.city ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
    },
  });

  const [formError, setFormError] = useState<string | null>(null);

  const legalNameId = useId();
  const legalNameErrorId = useId();
  const siretId = useId();
  const siretErrorId = useId();
  const streetId = useId();
  const streetErrorId = useId();
  const postalCodeId = useId();
  const postalCodeErrorId = useId();
  const cityId = useId();
  const cityErrorId = useId();
  const emailId = useId();
  const emailErrorId = useId();
  const phoneId = useId();

  const { ref: registerLegalNameRef, ...legalNameField } =
    register("legalName");

  async function onSubmit(values: CompanyProfileInput): Promise<void> {
    setFormError(null);
    const result = await updateCompanyProfile(values);
    if (result.ok) {
      onSaved();
    } else {
      setFormError("Could not save the company profile. Try again.");
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
        <Label htmlFor={legalNameId}>Legal / trading name</Label>
        <Input
          id={legalNameId}
          {...legalNameField}
          ref={(element) => {
            registerLegalNameRef(element);
            legalNameInputRef.current = element;
          }}
          aria-invalid={errors.legalName !== undefined}
          aria-describedby={
            errors.legalName !== undefined ? legalNameErrorId : undefined
          }
        />
        {errors.legalName !== undefined && (
          <p id={legalNameErrorId} className="text-destructive text-sm">
            {errors.legalName.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={siretId}>SIRET</Label>
        <Input
          id={siretId}
          {...register("siret")}
          aria-invalid={errors.siret !== undefined}
          aria-describedby={
            errors.siret !== undefined ? siretErrorId : undefined
          }
        />
        {errors.siret !== undefined && (
          <p id={siretErrorId} className="text-destructive text-sm">
            {errors.siret.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={streetId}>Street</Label>
        <Input
          id={streetId}
          {...register("street")}
          aria-invalid={errors.street !== undefined}
          aria-describedby={
            errors.street !== undefined ? streetErrorId : undefined
          }
        />
        {errors.street !== undefined && (
          <p id={streetErrorId} className="text-destructive text-sm">
            {errors.street.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={postalCodeId}>Postal code</Label>
        <Input
          id={postalCodeId}
          {...register("postalCode")}
          aria-invalid={errors.postalCode !== undefined}
          aria-describedby={
            errors.postalCode !== undefined ? postalCodeErrorId : undefined
          }
        />
        {errors.postalCode !== undefined && (
          <p id={postalCodeErrorId} className="text-destructive text-sm">
            {errors.postalCode.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={cityId}>City</Label>
        <Input
          id={cityId}
          {...register("city")}
          aria-invalid={errors.city !== undefined}
          aria-describedby={errors.city !== undefined ? cityErrorId : undefined}
        />
        {errors.city !== undefined && (
          <p id={cityErrorId} className="text-destructive text-sm">
            {errors.city.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={emailId}>Contact email</Label>
        <Input
          id={emailId}
          type="email"
          {...register("email")}
          aria-invalid={errors.email !== undefined}
          aria-describedby={
            errors.email !== undefined ? emailErrorId : undefined
          }
        />
        {errors.email !== undefined && (
          <p id={emailErrorId} className="text-destructive text-sm">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={phoneId}>Contact phone (optional)</Label>
        <Input id={phoneId} type="tel" {...register("phone")} />
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
 * The company-profile edit dialog.
 *
 * @param props.profile the profile already loaded by the `/settings` Server
 * Component - no fetch happens in this component.
 * @param props.trigger the element that opens the dialog - the Company
 * profile section's "Edit" button - rendered via `DialogTrigger asChild` so
 * the call site controls its own accessible name.
 * @returns the trigger wrapped with the dialog it opens.
 */
export function CompanyProfileEditForm({
  profile,
  trigger,
}: {
  profile: CompanyProfileRecord;
  trigger: ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const legalNameInputRef = useRef<HTMLInputElement>(null);

  function handleSaved(): void {
    setOpen(false);
  }

  function handleCancel(): void {
    setOpen(false);
  }

  // Keying on `open` forces the form to remount - and so to recompute its
  // `useForm` defaults from the current profile - every time the dialog
  // opens, matching the codebase's existing edit-dialog convention (see
  // `PartnerFormDialog`).
  const formKey = open ? "open" : "closed";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          legalNameInputRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit company profile</DialogTitle>
        </DialogHeader>
        <EditCompanyProfileForm
          key={formKey}
          profile={profile}
          legalNameInputRef={legalNameInputRef}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}

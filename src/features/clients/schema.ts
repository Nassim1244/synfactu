// Zod schemas for every input crossing the server boundary in the clients
// domain (`ai-rules/policy_architecture.md` -> Structure). Each Server Action
// in `actions.ts` parses its input against one of these before touching the
// repository (AD-005).

import { z } from "zod";

/** A non-empty, trimmed client name. */
const nameSchema = z.string().trim().min(1, "Name is required.");

/** A non-empty, trimmed short label (feeds invoice numbering, D-47). */
const shortLabelSchema = z.string().trim().min(1, "Short label is required.");

/** Shaped like an unsigned decimal with at most two fraction digits. */
const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

/** Matches only the zero value in any of its decimal spellings ("0", "0.0", "00.00"). */
const ZERO_PATTERN = /^0+(\.0{1,2})?$/;

/**
 * The default rate (TJM) as the raw decimal string a form field submits.
 *
 * One message covers every rejection - empty, non-numeric shape, or a
 * numeric value that is zero or negative - per the design's error copy
 * ("Enter a positive number."). The value never reaches `parseFloat`: zero is
 * detected with a second regex on the text itself, so no float is
 * constructed even for validation (`Money.fromDecimalString` does the real,
 * float-free parse later, at the action layer).
 */
const defaultRateSchema = z
  .string()
  .refine(
    (value) => DECIMAL_PATTERN.test(value) && !ZERO_PATTERN.test(value),
    "Enter a positive number.",
  );

/** The two fixed REGIME values a client may default to; the pair itself is not user-managed (AD-022). */
const regimeSchema = z.enum(["MICRO", "PORTAGE"]).nullable().optional();

/**
 * The referring partner, by id. No server-side "must currently be active"
 * re-check: an existing link to a since-deactivated partner keeps saving
 * unchanged (see the spec's Validation section) - the FK constraint alone
 * guards existence.
 */
const partnerIdSchema = z.number().int().positive().nullable().optional();

/** Input for `createClient`: `active` is not accepted here - a client is always created active. */
export const createClientSchema = z.object({
  name: nameSchema,
  shortLabel: shortLabelSchema,
  defaultRate: defaultRateSchema,
  billable: z.boolean().optional().default(true),
  regime: regimeSchema,
  partnerId: partnerIdSchema,
});

/** Input for `updateClient`: the full editable shape of an existing client. */
export const updateClientSchema = z.object({
  id: z.number().int().positive(),
  name: nameSchema,
  shortLabel: shortLabelSchema,
  defaultRate: defaultRateSchema,
  billable: z.boolean().optional().default(true),
  active: z.boolean(),
  regime: regimeSchema,
  partnerId: partnerIdSchema,
});

/** Input for `setClientActive`: the row-level active toggle. */
export const setClientActiveSchema = z.object({
  id: z.number().int().positive(),
  active: z.boolean(),
});

export type CreateClient = z.infer<typeof createClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;
export type SetClientActive = z.infer<typeof setClientActiveSchema>;

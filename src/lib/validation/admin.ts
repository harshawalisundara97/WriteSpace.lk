import { z } from "zod";

// Shared admin input schemas + uniform error surfacing (TASK-ADMIN-003).
// Every admin server action returns `ActionResult`; validation failures become
// one human-readable message via `zodErrorMessage`.

export type ActionResult = { ok: boolean; id?: string; error?: string };

export const DEMO_MESSAGE = "Demo mode — connect Supabase to save changes.";

const FIELD_LABELS: Record<string, string> = {
  min_subtotal_minor: "Minimum subtotal",
  flat_shipping_minor: "Flat shipping",
  free_shipping_threshold_minor: "Free shipping threshold",
  tax_rate_bps: "Tax rate",
  express_surcharge_minor: "Express surcharge",
  standard_description: "Standard delivery note",
  express_description: "Express delivery note",
  pickup_description: "Store pickup note",
  parent_id: "Parent",
  image_url: "Image URL",
  link_url: "Link URL",
  instagram_url: "Instagram URL",
  facebook_url: "Facebook URL",
  starts_at: "Start date",
  ends_at: "End date",
};

/** First issue as "Field: message" (field omitted for object-level issues). */
export function zodErrorMessage(error: z.ZodError, fallback = "Invalid input"): string {
  const issue = error.issues[0];
  if (!issue) return fallback;
  const field = [...issue.path].reverse().find((p): p is string => typeof p === "string");
  if (!field) return issue.message;
  const label = FIELD_LABELS[field] ?? field.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  return `${label}: ${issue.message}`;
}

/** Parse, or return a uniform failed result. */
export function parseInput<T extends z.ZodTypeAny>(
  schema: T,
  raw: unknown,
  fallback?: string,
): { ok: true; data: z.output<T> } | { ok: false; error: string } {
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: zodErrorMessage(parsed.error, fallback) };
}

/** Supabase/Postgres error → admin-friendly message. */
export function dbErrorMessage(error: { message?: string; code?: string } | null | undefined, fallback = "Database error"): string {
  if (!error) return fallback;
  if (error.code === "23505") return "That slug or code is already in use";
  if (error.code === "23503") return "This item is still referenced elsewhere and can't be changed or removed";
  return error.message || fallback;
}

export const idSchema = z.string().uuid("Invalid id");

const slug = z
  .string()
  .trim()
  .min(2, "Must be at least 2 characters")
  .max(120)
  .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only");

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional().or(z.literal(""));

// Absolute http(s) URL or site-relative path ("/bundles").
const linkUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v), "Use a full URL or a path starting with /");

const optionalDate = z
  .string()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Enter a valid date")
  .nullable()
  .optional();

function endsAfterStarts(v: { starts_at?: string | null; ends_at?: string | null }) {
  if (!v.starts_at || !v.ends_at) return true;
  return Date.parse(v.ends_at) > Date.parse(v.starts_at);
}
const dateOrder = { message: "Must be after the start date", path: ["ends_at"] };

// ---------- Categories / collections ----------

export const categorySchema = z
  .object({
    id: idSchema.optional(),
    name: z.string().trim().min(2, "Enter a name").max(120),
    slug,
    description: optionalText(500),
    parent_id: idSchema.nullable().optional(),
    age_group: z.enum(["kids", "adults", "all"]),
    position: z.number().int().default(0),
    is_featured: z.boolean().default(false),
  })
  .refine((c) => !c.id || c.parent_id !== c.id, { message: "A category can't be its own parent", path: ["parent_id"] });

export const collectionSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(2, "Enter a name").max(120),
  slug,
  description: optionalText(500),
  position: z.number().int().default(0),
  is_featured: z.boolean().default(false),
});

// ---------- Promotions / banners ----------

export const promoSchema = z
  .object({
    id: idSchema.optional(),
    name: z.string().trim().min(2, "Enter a name").max(120),
    type: z.enum(["percentage", "fixed", "bxgy", "free_shipping"]),
    value: z.number().int().min(0, "Must be 0 or more"),
    code: z
      .string()
      .trim()
      .max(40)
      .regex(/^[A-Za-z0-9_-]*$/, "Letters, numbers, dashes and underscores only")
      .optional(),
    min_subtotal_minor: z.number().int().min(0, "Must be 0 or more").default(0),
    usage_limit: z.number().int().min(0).nullable().optional(),
    per_customer_limit: z.number().int().min(0).nullable().optional(),
    stackable: z.boolean().default(false),
    priority: z.number().int().default(0),
    is_active: z.boolean().default(true),
    starts_at: optionalDate,
    ends_at: optionalDate,
  })
  .refine((p) => p.type !== "percentage" || (p.value >= 1 && p.value <= 100), { message: "Percentage must be between 1 and 100", path: ["value"] })
  .refine((p) => p.type !== "fixed" || p.value >= 1, { message: "Discount amount must be greater than 0", path: ["value"] })
  .refine(endsAfterStarts, dateOrder);

export const bannerSchema = z
  .object({
    id: idSchema.optional(),
    title: z.string().trim().min(2, "Enter a title").max(160),
    image_url: z.string().trim().url("Enter a valid URL").max(500).nullable().optional().or(z.literal("")),
    link_url: linkUrl.optional(),
    placement: z.enum(["home_hero", "promo_strip", "category"]),
    position: z.number().int().default(0),
    is_active: z.boolean().default(true),
    starts_at: optionalDate,
    ends_at: optionalDate,
  })
  .refine(endsAfterStarts, dateOrder);

// ---------- Store settings ----------

const socialUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Enter a full URL starting with https://")
  .nullable()
  .optional();

export const settingsSchema = z.object({
  store_name: z.string().trim().min(1, "Enter a store name").max(120),
  currency: z.string().trim().length(3, "Use a 3-letter currency code").transform((v) => v.toUpperCase()),
  flat_shipping_minor: z.number().int().min(0, "Must be 0 or more"),
  free_shipping_threshold_minor: z.number().int().min(0, "Must be 0 or more").nullable(),
  tax_rate_bps: z.number().int().min(0, "Must be 0 or more").max(10000, "Can't exceed 100%"),
  support_email: z.string().trim().email("Enter a valid email").nullable().or(z.literal("")),
  support_phone: nullableText(40),
  whatsapp: nullableText(40),
  address: nullableText(300),
  instagram_url: socialUrl,
  facebook_url: socialUrl,
  // Delivery methods & fees (TASK-ADMIN-005). Optional so older callers keep
  // working; defaults match the pre-TASK-ADMIN-005 constants.
  express_surcharge_minor: z.number().int().min(0, "Must be 0 or more").default(40000),
  express_enabled: z.boolean().default(true),
  pickup_enabled: z.boolean().default(true),
  standard_description: nullableText(120),
  express_description: nullableText(120),
  pickup_description: nullableText(120),
});

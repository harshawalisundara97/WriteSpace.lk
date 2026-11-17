import { z } from "zod";
import { QUOTE_MAX_QTY } from "@/lib/quotes/rules";

// Quote request from the cart (TASK-NEXT-009b).
export const quoteRequestSchema = z.object({
  contact_name: z.string().trim().min(2, "Enter your name").max(120),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(1000, "Notes: 1000 characters max").optional().or(z.literal("")),
  // variant_id → requested quantity (may exceed stock; admin confirms availability).
  qtys: z.record(z.string().uuid().or(z.string().min(1).max(64)), z.number().int().min(0).max(QUOTE_MAX_QTY, `${QUOTE_MAX_QTY.toLocaleString()} units max per line`)).default({}),
  // Honeypot: humans leave it empty.
  website: z.string().max(500).optional().or(z.literal("")),
});

export type QuoteRequestInput = z.input<typeof quoteRequestSchema>;

// Admin pricing (TASK-NEXT-009c). Prices are minor units.
export const quotePricingSchema = z.object({
  quote_id: z.string().uuid(),
  lines: z.array(z.object({
    id: z.string().uuid(),
    quoted_unit_minor: z.number().int().min(0, "Prices can't be negative").nullable(),
  })).min(1).max(100),
  shipping_minor: z.number().int().min(0, "Shipping can't be negative").default(0),
  valid_days: z.number().int().min(1, "At least 1 day").max(90, "90 days max").default(14),
  admin_notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type QuotePricingInput = z.input<typeof quotePricingSchema>;

// Buyer accepts a priced quote (TASK-NEXT-009d).
export const quoteAcceptSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/, "Invalid link"),
  line1: z.string().trim().min(3, "Enter the delivery address").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter the city").max(100),
  district: z.string().trim().max(40).optional().or(z.literal("")),
  postal_code: z.string().trim().max(20).optional().or(z.literal("")),
  phone: z.string().trim().min(7, "Enter a phone number for the courier").max(20),
  po_number: z.string().trim().max(60, "PO number: 60 characters max").optional().or(z.literal("")),
});
export type QuoteAcceptInput = z.input<typeof quoteAcceptSchema>;

import { z } from "zod";
import { PAYMENT_METHOD_IDS } from "@/lib/checkout/cod";
import { GIFT_MESSAGE_MAX } from "@/lib/checkout/gift";
import { DELIVERY_METHOD_IDS, DEFAULT_DELIVERY_METHOD, deliveryMethod } from "@/lib/checkout/delivery";

export const addressSchema = z.object({
  full_name: z.string().min(2, "Enter your name").max(120),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a phone number").max(20),
  line1: z.string().min(3, "Enter your address").max(200),
  line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(2, "Enter your city").max(100),
  postal_code: z.string().max(20).optional().or(z.literal("")),
  country: z.string().min(2).max(2).default("LK"),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type AddressInput = z.infer<typeof addressSchema>;

// Checkout = contact + address + delivery method. Store pickup needs no
// delivery address, so line1 / city are only required when the method ships.
export const checkoutSchema = addressSchema
  .extend({
    line1: z.string().max(200).optional().or(z.literal("")),
    city: z.string().max(100).optional().or(z.literal("")),
    delivery_method: z.enum(DELIVERY_METHOD_IDS).default(DEFAULT_DELIVERY_METHOD),
    payment_method: z.enum(PAYMENT_METHOD_IDS).default("online"),
    // District — required (and checked against admin rules) for cash on delivery.
    district: z.string().max(40).optional().or(z.literal("")),
    // Gift wrap & message (TASK-NEXT-007); fee re-checked against settings server-side.
    gift_wrap: z.boolean().default(false),
    // Loyalty points to redeem (TASK-NEXT-008c); re-checked against balance + cap server-side.
    loyalty_points: z.number().int("Points must be a whole number").min(0).max(10_000_000).default(0),
    gift_message: z.string().max(GIFT_MESSAGE_MAX, `Gift message: ${GIFT_MESSAGE_MAX} characters max`).optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (!deliveryMethod(v.delivery_method).needsAddress) return;
    if ((v.line1 ?? "").trim().length < 3) ctx.addIssue({ code: "custom", path: ["line1"], message: "Enter your address" });
    if ((v.city ?? "").trim().length < 2) ctx.addIssue({ code: "custom", path: ["city"], message: "Enter your city" });
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;

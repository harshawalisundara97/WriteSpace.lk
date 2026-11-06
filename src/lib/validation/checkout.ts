import { z } from "zod";

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

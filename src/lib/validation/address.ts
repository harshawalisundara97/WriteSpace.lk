import { z } from "zod";

// A saved delivery address (account address book — TASK-010). Email is an
// account-level field, so it is not stored per address; a label ("Home",
// "Office") and a default flag are added on top of the delivery fields.
export const addressBookSchema = z.object({
  label: z.string().max(60).optional().or(z.literal("")),
  full_name: z.string().min(2, "Enter a name").max(120),
  phone: z.string().min(7, "Enter a phone number").max(20),
  line1: z.string().min(3, "Enter the address").max(200),
  line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(2, "Enter the city").max(100),
  postal_code: z.string().max(20).optional().or(z.literal("")),
  country: z.string().min(2).max(2).default("LK"),
  is_default: z.boolean().default(false),
});

export type AddressBookInput = z.input<typeof addressBookSchema>;

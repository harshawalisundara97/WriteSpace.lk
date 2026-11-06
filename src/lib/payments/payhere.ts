import "server-only";
import type { PaymentProvider } from "./provider";

// Placeholder for the Sri Lankan gateway. Stripe often can't process live LKR
// for local sellers, so PayHere is the likely day-1 processor. Implement the
// hosted-checkout redirect + server-side hash + notify_url handling here when
// credentials are available; checkout/webhook code consumes the same interface.
export const payhereProvider: PaymentProvider = {
  name: "payhere",
  async createIntent() {
    throw new Error("PayHere is not configured yet. Set PAYMENT_PROVIDER=stripe or implement payhere.ts.");
  },
  async refund() {
    throw new Error("PayHere refunds are not configured yet.");
  },
};

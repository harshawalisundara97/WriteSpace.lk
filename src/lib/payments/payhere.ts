import "server-only";
import type { PaymentProvider, CreateIntentInput, CreateIntentResult } from "./provider";
import { PAYHERE_CHECKOUT_URL, buildPayhereFields } from "./payhere-checkout";

// Sri Lankan gateway (hosted checkout). The browser POSTs the signed fields to
// PayHere; the payment result arrives on notify_url (TASK-NEXT-001b), which
// verifies md5sig and records PayHere's payment_id. Refunds: TASK-NEXT-001c.
function config() {
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
  if (!merchantId || !merchantSecret) {
    throw new Error("PayHere is not configured. Set PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET.");
  }
  const sandbox = process.env.PAYHERE_SANDBOX !== "false";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { merchantId, merchantSecret, sandbox, siteUrl };
}

export const payhereProvider: PaymentProvider = {
  name: "payhere",

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const cfg = config();
    if (!input.customer) throw new Error("PayHere needs customer contact details.");
    const fields = buildPayhereFields({
      merchantId: cfg.merchantId,
      merchantSecret: cfg.merchantSecret,
      siteUrl: cfg.siteUrl,
      orderId: input.orderId,
      orderNumber: input.orderNumber ?? input.orderId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      customer: { ...input.customer, email: input.email },
    });
    return {
      provider: "payhere",
      // PayHere's own payment_id only exists after payment; key by our order id
      // until the notify webhook replaces it.
      providerPaymentId: input.orderId,
      redirectUrl: cfg.sandbox ? PAYHERE_CHECKOUT_URL.sandbox : PAYHERE_CHECKOUT_URL.live,
      redirectFields: fields,
    };
  },

  async refund() {
    throw new Error("PayHere refunds are not configured yet.");
  },
};

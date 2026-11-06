import "server-only";
import Stripe from "stripe";
import type {
  PaymentProvider, CreateIntentInput, CreateIntentResult, RefundInput, RefundResult,
} from "./provider";

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const pi = await stripe().paymentIntents.create(
      {
        amount: input.amountMinor,
        currency: input.currency.toLowerCase(),
        receipt_email: input.email,
        metadata: { order_id: input.orderId },
        automatic_payment_methods: { enabled: true },
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return {
      provider: "stripe",
      providerPaymentId: pi.id,
      clientSecret: pi.client_secret ?? undefined,
    };
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    const refund = await stripe().refunds.create(
      { payment_intent: input.providerPaymentId, amount: input.amountMinor },
      { idempotencyKey: input.idempotencyKey },
    );
    const status: RefundResult["status"] =
      refund.status === "succeeded" ? "succeeded" : refund.status === "failed" ? "failed" : "pending";
    return { providerRefundId: refund.id, status };
  },
};

// Payment provider abstraction. Stripe is implemented now; PayHere can be
// added by implementing this interface — no changes needed in checkout/webhook
// call sites beyond the factory in ./index.ts.

export interface CreateIntentInput {
  orderId: string;
  amountMinor: number;
  currency: string;
  email: string;
  idempotencyKey: string;
}

export interface CreateIntentResult {
  provider: string;
  providerPaymentId: string;
  // For client-side confirmation (Stripe PaymentElement). PayHere would instead
  // return a redirect URL + fields; add those to this union when implemented.
  clientSecret?: string;
  redirectUrl?: string;
}

export interface RefundInput {
  providerPaymentId: string;
  amountMinor: number;
  idempotencyKey: string;
}

export interface RefundResult {
  providerRefundId: string;
  status: "pending" | "succeeded" | "failed";
}

export interface PaymentProvider {
  readonly name: string;
  createIntent(input: CreateIntentInput): Promise<CreateIntentResult>;
  refund(input: RefundInput): Promise<RefundResult>;
}

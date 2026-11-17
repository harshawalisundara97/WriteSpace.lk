// Payment provider abstraction. Stripe is implemented now; PayHere can be
// added by implementing this interface — no changes needed in checkout/webhook
// call sites beyond the factory in ./index.ts.

export interface CreateIntentInput {
  orderId: string;
  amountMinor: number;
  currency: string;
  email: string;
  idempotencyKey: string;
  /** Human order number (shown on hosted checkout pages). */
  orderNumber?: string;
  /** Contact/billing details — required by redirect gateways such as PayHere. */
  customer?: { fullName: string; phone: string; address: string; city: string; country: string };
}

export interface CreateIntentResult {
  provider: string;
  providerPaymentId: string;
  // Client-side confirmation (Stripe PaymentElement)…
  clientSecret?: string;
  // …or a hosted-checkout redirect: the browser POSTs redirectFields to redirectUrl (PayHere).
  redirectUrl?: string;
  redirectFields?: Record<string, string>;
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

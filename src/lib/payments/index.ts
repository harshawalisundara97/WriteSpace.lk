import "server-only";
import type { PaymentProvider } from "./provider";
import { stripeProvider } from "./stripe";
import { payhereProvider } from "./payhere";

export function getPaymentProvider(): PaymentProvider {
  const name = (process.env.PAYMENT_PROVIDER ?? "stripe").toLowerCase();
  switch (name) {
    case "payhere": return payhereProvider;
    case "stripe":
    default: return stripeProvider;
  }
}

export * from "./provider";

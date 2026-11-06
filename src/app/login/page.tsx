import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
export const metadata = { title: "Sign in" };
export default function LoginPage() {
  return <div className="ws-container py-20"><Suspense><AuthForm mode="login" /></Suspense></div>;
}

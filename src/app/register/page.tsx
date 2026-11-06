import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
export const metadata = { title: "Create account" };
export default function RegisterPage() {
  return <div className="ws-container py-20"><Suspense><AuthForm mode="register" /></Suspense></div>;
}

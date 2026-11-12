"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

const field =
  "h-11 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:ring-2 focus:ring-brand/30";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, email, phone, subject, message, company }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (res.ok && data.ok) {
          setSent(true);
        } else {
          setMsg({ text: data.error ?? "Could not send your message. Please try again.", ok: false });
        }
      } catch {
        setMsg({ text: "Network error. Please check your connection and try again.", ok: false });
      }
    });
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-line bg-paper-2 p-6 text-sm text-ink-soft">
        <p className="font-display text-lg font-semibold text-ink">Thanks — your message is on its way.</p>
        <p className="mt-2">
          We&apos;ve received your enquiry and will reply by email, usually within one working day.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => { setSent(false); setSubject(""); setMessage(""); }}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-ink-soft">Name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-ink-soft">Email</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={field} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-ink-soft">Phone <span className="text-ink-soft/60">(optional)</span></span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-ink-soft">Subject</span>
          <input required value={subject} onChange={(e) => setSubject(e.target.value)} className={field} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm text-ink-soft">Message</span>
        <textarea required rows={6} value={message} onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-brand/30" />
      </label>

      {/* Honeypot — hidden from humans, left empty by real users. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden" tabIndex={-1}>
        <label>
          Company
          <input value={company} onChange={(e) => setCompany(e.target.value)} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send message"}</Button>
        {msg && <span className={msg.ok ? "text-sm text-mint" : "text-sm text-accent"}>{msg.text}</span>}
      </div>
    </form>
  );
}

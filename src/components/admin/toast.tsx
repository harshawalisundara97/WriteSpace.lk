"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info";
interface Toast { id: number; tone: ToastTone; message: string }

interface ToastCtx {
  toast: (message: string, tone?: ToastTone) => void;
}
const Ctx = createContext<ToastCtx | null>(null);

let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = ++seq;
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 max-w-[90vw] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id} layout
              initial={{ opacity: 0, x: 24, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 24 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-paper px-4 py-3 shadow-lift"
            >
              {t.tone === "success" && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mint" />}
              {t.tone === "error" && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />}
              {t.tone === "info" && <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" />}
              <p className="flex-1 text-sm text-ink">{t.message}</p>
              <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-ink-soft hover:text-ink"><X className="h-4 w-4" /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}

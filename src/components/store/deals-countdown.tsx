"use client";

import { useEffect, useState } from "react";

function remaining(target: number) {
  const ms = Math.max(target - Date.now(), 0);
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  const s = Math.floor((ms % 6e4) / 1000);
  return { h, m, s };
}

export function DealsCountdown({ endsAt }: { endsAt: string }) {
  const target = new Date(endsAt).getTime();
  const [t, setT] = useState(() => remaining(target));
  useEffect(() => {
    const id = setInterval(() => setT(remaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center gap-1.5 font-display text-sm font-semibold tabular-nums">
      {[t.h, t.m, t.s].map((v, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="rounded-lg bg-ink px-2 py-1 text-paper">{pad(v)}</span>
          {i < 2 && <span className="text-ink-soft">:</span>}
        </span>
      ))}
    </div>
  );
}

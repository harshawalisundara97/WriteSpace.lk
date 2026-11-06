"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importProductsCsv } from "@/lib/admin/csv-actions";

export function CsvTools() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setMsg(null);
    start(async () => {
      const res = await importProductsCsv(text);
      setMsg(res.ok ? `Imported — ${res.created} created, ${res.updated} updated` : res.error ?? "Import failed");
      if (res.ok) router.refresh();
    });
    e.target.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href="/api/admin/products/export"><Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export CSV</Button></a>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-paper-2">
        <Upload className="h-4 w-4" /> {pending ? "Importing…" : "Import CSV"}
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} disabled={pending} />
      </label>
      {msg && <span className="text-sm text-ink-soft">{msg}</span>}
    </div>
  );
}

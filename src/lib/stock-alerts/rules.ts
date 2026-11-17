// Back-in-stock alerts — TASK-NEXT-005. Pure helpers.

export interface StockLevel { on_hand: number; reserved: number }

/** Sellable units (never negative). */
export function availableUnits(inv: StockLevel | null | undefined): number {
  return Math.max((inv?.on_hand ?? 0) - (inv?.reserved ?? 0), 0);
}

/** Alerts may only be requested for a variant that can't be bought right now. */
export function canRequestAlert(inv: StockLevel | null | undefined): boolean {
  return availableUnits(inv) <= 0;
}

export interface DemandRow {
  variant_id: string;
  product_name: string;
  product_slug: string;
  variant_name: string | null;
  sku: string;
  available: number;
}

export interface DemandSummary extends DemandRow {
  waiting: number;
  oldest: string;
}

/** Group pending alerts per variant, most-wanted first (ties: longest waiting). */
export function summariseDemand(alerts: (DemandRow & { created_at: string })[]): DemandSummary[] {
  const by = new Map<string, DemandSummary>();
  for (const a of alerts) {
    const cur = by.get(a.variant_id);
    if (cur) {
      cur.waiting += 1;
      if (a.created_at < cur.oldest) cur.oldest = a.created_at;
    } else {
      const { created_at, ...row } = a;
      by.set(a.variant_id, { ...row, waiting: 1, oldest: created_at });
    }
  }
  return [...by.values()].sort((x, y) => y.waiting - x.waiting || x.oldest.localeCompare(y.oldest));
}

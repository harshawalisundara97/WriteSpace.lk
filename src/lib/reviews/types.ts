export interface ReviewView {
  id: string;
  rating: number;      // 1-5
  title: string | null;
  body: string | null;
  author: string;
  created_at: string;
  verified: boolean;
}

export interface ReviewSummary {
  average: number;           // 0 when no reviews
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function summarize(items: ReviewView[]): ReviewSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const r of items) distribution[Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5]++;
  const count = items.length;
  const average = count ? items.reduce((s, r) => s + r.rating, 0) / count : 0;
  return { average, count, distribution };
}

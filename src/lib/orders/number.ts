/** Human order number, e.g. WS-20261117-4821 (local date + 4 random digits; unique index catches clashes). */
export function orderNumber(d: Date = new Date()): string {
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `WS-${ymd}-${String(Math.floor(1000 + Math.random() * 9000))}`;
}

// Money is ALWAYS integer minor units (e.g. LKR cents). Never use floats for math.

export type Minor = number; // integer minor units

export function toMinor(major: number): Minor {
  return Math.round(major * 100);
}

export function toMajor(minor: Minor): number {
  return minor / 100;
}

const FORMATTERS = new Map<string, Intl.NumberFormat>();

export function formatMoney(minor: Minor, currency = "LKR", locale = "en-LK"): string {
  const key = `${locale}:${currency}`;
  let fmt = FORMATTERS.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, { style: "currency", currency });
    FORMATTERS.set(key, fmt);
  }
  return fmt.format(toMajor(minor));
}

/** Percentage off, rounded to nearest minor unit. pct is 0-100. */
export function applyPercent(minor: Minor, pct: number): Minor {
  return Math.round((minor * pct) / 100);
}

export function sumMinor(values: Minor[]): Minor {
  return values.reduce((a, b) => a + b, 0);
}

export function clampMinor(minor: Minor, min = 0): Minor {
  return Math.max(minor, min);
}

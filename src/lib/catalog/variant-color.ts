// Maps colour words found in a variant's name/options to a swatch hex.

export const COLOR_HEX: Record<string, string> = {
  black: "#1c1a2e", white: "#f3f0ea", teal: "#2fb3a0", blue: "#3b6fe0", red: "#e8533f",
  green: "#3ba55d", yellow: "#f4c13a", pink: "#ef7bb0", purple: "#8b5cf6", orange: "#f49a3a",
  natural: "#c9b18a", bamboo: "#c9b18a", grey: "#9a97a8", gray: "#9a97a8", brown: "#8a5a3c",
};

export function variantColor(name: string | null, options?: Record<string, string>): string | null {
  const hay = `${name ?? ""} ${Object.values(options ?? {}).join(" ")}`.toLowerCase();
  for (const key of Object.keys(COLOR_HEX)) if (hay.includes(key)) return COLOR_HEX[key];
  return null;
}

export function variantColorName(name: string | null, options?: Record<string, string>): string | null {
  const hay = `${name ?? ""} ${Object.values(options ?? {}).join(" ")}`.toLowerCase();
  for (const key of Object.keys(COLOR_HEX)) if (hay.includes(key)) return key;
  return null;
}

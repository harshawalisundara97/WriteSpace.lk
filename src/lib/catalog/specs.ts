// Stationery product specifications (GSM, paper size, ruling, sheet count, colour).
// Stored on products.specs (jsonb, keyed by SpecKey). Shared by the PDP spec
// table, the admin product form, and (TASK-006) spec-based catalog filters —
// one source of truth for the field set, labels, inputs and display formatting.

export interface ProductSpecs {
  gsm?: number | null; // paper weight, g/m²
  paper_size?: string | null; // A4, A5, B5, Letter, …
  ruling?: string | null; // Ruled, Dotted, Plain, Squared, Grid
  sheet_count?: number | null; // number of sheets
  colour?: string | null; // primary / cover colour
}

export type SpecKey = keyof ProductSpecs;

export interface SpecField {
  key: SpecKey;
  label: string;
  kind: "number" | "text" | "select";
  options?: string[]; // choices for kind "select"
  suffix?: string; // appended to the displayed value (e.g. " gsm")
  placeholder?: string;
}

// Ordered: this is also the display order in the PDP spec table.
export const SPEC_FIELDS: SpecField[] = [
  { key: "gsm", label: "GSM", kind: "number", suffix: " gsm", placeholder: "e.g. 80" },
  { key: "paper_size", label: "Paper size", kind: "select", options: ["A4", "A5", "A6", "B5", "Letter", "Legal"], placeholder: "Select size" },
  { key: "ruling", label: "Ruling", kind: "select", options: ["Ruled", "Dotted", "Plain", "Squared", "Grid"], placeholder: "Select ruling" },
  { key: "sheet_count", label: "Sheets", kind: "number", suffix: " sheets", placeholder: "e.g. 160" },
  { key: "colour", label: "Colour", kind: "text", placeholder: "e.g. Teal" },
];

function formatSpec(field: SpecField, value: string | number): string {
  const v = String(value).trim();
  if (!v) return "";
  return field.suffix ? `${v}${field.suffix}` : v;
}

// Display-ready [label, value] pairs for the specs that are actually set,
// in SPEC_FIELDS order. Empty/null specs are skipped.
export function specEntries(
  specs: ProductSpecs | null | undefined,
): { key: SpecKey; label: string; value: string }[] {
  if (!specs) return [];
  const out: { key: SpecKey; label: string; value: string }[] = [];
  for (const field of SPEC_FIELDS) {
    const raw = specs[field.key];
    if (raw == null || raw === "") continue;
    const value = formatSpec(field, raw);
    if (value) out.push({ key: field.key, label: field.label, value });
  }
  return out;
}

export function hasSpecs(specs: ProductSpecs | null | undefined): boolean {
  return specEntries(specs).length > 0;
}

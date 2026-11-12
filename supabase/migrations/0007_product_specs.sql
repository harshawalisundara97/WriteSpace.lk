-- Stationery product specifications (GSM, paper size, ruling, sheet count, colour).
-- Keyed jsonb: { gsm, paper_size, ruling, sheet_count, colour }. Product-level
-- (not per-variant); powers the PDP spec table and later spec-based filters.
alter table products add column if not exists specs jsonb not null default '{}'::jsonb;

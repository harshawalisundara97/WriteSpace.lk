-- B2B quotes — TASK-NEXT-009c
-- Unguessable link token so a (possibly guest) buyer can view their priced quote
-- at /quote/view/<token> without signing in; sent_at records the last send.
alter table quotes add column if not exists access_token text not null
  default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
create unique index if not exists uq_quotes_access_token on quotes(access_token);
alter table quotes add column if not exists sent_at timestamptz;

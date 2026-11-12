-- Store contact & social links (shown in the storefront footer).
alter table store_settings add column if not exists support_phone text;
alter table store_settings add column if not exists whatsapp text;
alter table store_settings add column if not exists address text;
alter table store_settings add column if not exists instagram_url text;
alter table store_settings add column if not exists facebook_url text;

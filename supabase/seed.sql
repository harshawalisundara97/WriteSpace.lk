-- WriteSpace.lk — seed data (sample stationery, kids + adults)
-- Prices are LKR minor units (cents): LKR 1,250.00 => 125000
-- Run after migrations. Idempotent-ish: uses fixed slugs/SKUs.

-- ---------- categories ----------
insert into categories (id, name, slug, age_group, is_featured, position) values
  ('11111111-0000-0000-0000-000000000001','Writing & Pens','writing-pens','all',true,1),
  ('11111111-0000-0000-0000-000000000002','Notebooks & Paper','notebooks-paper','all',true,2),
  ('11111111-0000-0000-0000-000000000003','Art & Craft','art-craft','all',true,3),
  ('11111111-0000-0000-0000-000000000004','Kids Corner','kids-corner','kids',true,4),
  ('11111111-0000-0000-0000-000000000005','Office & Desk','office-desk','adults',true,5)
on conflict (slug) do nothing;

-- ---------- collections ----------
insert into collections (id, name, slug, is_featured, position) values
  ('22222222-0000-0000-0000-000000000001','Back to School','back-to-school',true,1),
  ('22222222-0000-0000-0000-000000000002','New Arrivals','new-arrivals',true,2),
  ('22222222-0000-0000-0000-000000000003','Deals of the Day','deals-of-the-day',true,3)
on conflict (slug) do nothing;

-- ---------- products + variants + inventory ----------
-- helper pattern repeated per product
do $$
declare pid uuid; vid uuid;
begin
  -- 1. Gel pens (kids)
  pid := '33333333-0000-0000-0000-000000000001';
  insert into products (id, category_id, name, slug, description, brand, age_group, status, images)
  values (pid,'11111111-0000-0000-0000-000000000001','Rainbow Gel Pens (12-pack)','rainbow-gel-pens-12',
    'Smooth-writing glitter gel pens in 12 vivid colours. Perfect for kids'' journals and doodles.',
    'DooWrite','kids','published','[{"url":"/images/gel-pens.jpg","alt":"Rainbow gel pens"}]')
  on conflict (slug) do nothing;
  vid := '44444444-0000-0000-0000-000000000001';
  insert into product_variants (id, product_id, sku, name, price_minor, compare_at_minor)
  values (vid,pid,'WS-GEL-12','12-pack',85000,120000) on conflict (sku) do nothing;
  insert into inventory (variant_id, on_hand) values (vid,120) on conflict do nothing;

  -- 2. Fountain pen (adults)
  pid := '33333333-0000-0000-0000-000000000002';
  insert into products (id, category_id, name, slug, description, brand, age_group, status, images)
  values (pid,'11111111-0000-0000-0000-000000000001','Classic Fountain Pen','classic-fountain-pen',
    'Brushed-steel fountain pen with a fine nib. Comes gift-boxed with two ink cartridges.',
    'Inkwell','adults','published','[{"url":"/images/fountain-pen.jpg","alt":"Fountain pen"}]')
  on conflict (slug) do nothing;
  vid := '44444444-0000-0000-0000-000000000002';
  insert into product_variants (id, product_id, sku, name, options, price_minor)
  values (vid,pid,'WS-FP-BLK','Black / Fine','{"color":"Black","nib":"Fine"}',345000) on conflict (sku) do nothing;
  insert into inventory (variant_id, on_hand) values (vid,40) on conflict do nothing;

  -- 3. Dotted notebook (all)
  pid := '33333333-0000-0000-0000-000000000003';
  insert into products (id, category_id, name, slug, description, brand, age_group, status, images, specs, price_tiers)
  values (pid,'11111111-0000-0000-0000-000000000002','A5 Dotted Notebook','a5-dotted-notebook',
    '160gsm bleed-proof dotted pages, lay-flat binding, elastic closure. Ideal for bullet journaling.',
    'PaperCo','all','published','[{"url":"/images/dotted-notebook.jpg","alt":"A5 dotted notebook"}]','{"gsm":160,"paper_size":"A5","ruling":"Dotted","sheet_count":160}','[{"min_qty":5,"discount_bps":500},{"min_qty":10,"discount_bps":1000}]')
  on conflict (slug) do nothing;
  insert into product_variants (id, product_id, sku, name, options, price_minor) values
    ('44444444-0000-0000-0000-000000000013',pid,'WS-NB-A5-TEAL','A5 / Teal','{"size":"A5","color":"Teal"}',150000),
    ('44444444-0000-0000-0000-000000000023',pid,'WS-NB-A5-BLK','A5 / Black','{"size":"A5","color":"Black"}',150000)
  on conflict (sku) do nothing;
  insert into inventory (variant_id, on_hand) values
    ('44444444-0000-0000-0000-000000000013',75),
    ('44444444-0000-0000-0000-000000000023',3)   -- low stock demo
  on conflict do nothing;

  -- 4. Watercolour set (art)
  pid := '33333333-0000-0000-0000-000000000004';
  insert into products (id, category_id, name, slug, description, brand, age_group, status, images)
  values (pid,'11111111-0000-0000-0000-000000000003','Watercolour Paint Set (24)','watercolour-set-24',
    '24 half-pans of vibrant, blendable watercolour with a travel brush. Non-toxic.',
    'ArtLab','all','published','[{"url":"/images/watercolour.jpg","alt":"Watercolour set"}]')
  on conflict (slug) do nothing;
  vid := '44444444-0000-0000-0000-000000000004';
  insert into product_variants (id, product_id, sku, name, price_minor, compare_at_minor)
  values (vid,pid,'WS-WC-24','24 half-pans',275000,320000) on conflict (sku) do nothing;
  insert into inventory (variant_id, on_hand) values (vid,60) on conflict do nothing;

  -- 5. Crayons (kids)
  pid := '33333333-0000-0000-0000-000000000005';
  insert into products (id, category_id, name, slug, description, brand, age_group, status, images)
  values (pid,'11111111-0000-0000-0000-000000000004','Jumbo Crayons (24)','jumbo-crayons-24',
    'Chunky, easy-grip crayons for little hands. Washable and non-toxic.',
    'DooWrite','kids','published','[{"url":"/images/crayons.jpg","alt":"Jumbo crayons"}]')
  on conflict (slug) do nothing;
  vid := '44444444-0000-0000-0000-000000000005';
  insert into product_variants (id, product_id, sku, name, price_minor)
  values (vid,pid,'WS-CRAY-24','24-pack',62000) on conflict (sku) do nothing;
  insert into inventory (variant_id, on_hand) values (vid,200) on conflict do nothing;

  -- 6. Desk organizer (office)
  pid := '33333333-0000-0000-0000-000000000006';
  insert into products (id, category_id, name, slug, description, brand, age_group, status, images)
  values (pid,'11111111-0000-0000-0000-000000000005','Bamboo Desk Organizer','bamboo-desk-organizer',
    'Minimalist bamboo caddy with slots for pens, phone, notes and clips. Sustainably sourced.',
    'DeskLife','adults','published','[{"url":"/images/organizer.jpg","alt":"Bamboo desk organizer"}]')
  on conflict (slug) do nothing;
  vid := '44444444-0000-0000-0000-000000000006';
  insert into product_variants (id, product_id, sku, name, price_minor, compare_at_minor)
  values (vid,pid,'WS-ORG-BMB','Natural bamboo',420000,520000) on conflict (sku) do nothing;
  insert into inventory (variant_id, on_hand) values (vid,35) on conflict do nothing;
end $$;

-- ---------- collection membership ----------
insert into product_collections (product_id, collection_id) values
  ('33333333-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000002'),
  ('33333333-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000002'),
  ('33333333-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000003'),
  ('33333333-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000003'),
  ('33333333-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000003')
on conflict do nothing;

-- ---------- bundles & school packs ----------
insert into bundles (id, name, slug, description, age_group, grade_label, bundle_price_minor, is_featured, position) values
  ('55555555-0000-0000-0000-000000000001','Grade 1–3 Starter Pack','grade-1-3-starter-pack','Everything a young learner needs for the new term — chunky crayons, smooth gel pens and ruled notebooks, picked for small hands.','kids','Grade 1–3',459000,true,1),
  ('55555555-0000-0000-0000-000000000002','Office Essentials Pack','office-essentials-pack','A desk-ready set for grown-ups — a classic fountain pen, a bamboo organizer and a dotted notebook for notes and planning.','adults','Office starter',829000,true,2),
  ('55555555-0000-0000-0000-000000000003','Little Artist Pack','little-artist-pack','Spark creativity with a vibrant watercolour set, jumbo crayons and glitter gel pens — a complete art kit in one.','kids','Ages 4+',null,false,3)
on conflict (slug) do nothing;

insert into bundle_items (bundle_id, product_id, variant_id, quantity, position) values
  ('55555555-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000005','44444444-0000-0000-0000-000000000005',2,0),
  ('55555555-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001',1,1),
  ('55555555-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000003','44444444-0000-0000-0000-000000000013',2,2),
  ('55555555-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000002',1,0),
  ('55555555-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000006','44444444-0000-0000-0000-000000000006',1,1),
  ('55555555-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000003','44444444-0000-0000-0000-000000000013',1,2),
  ('55555555-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000004','44444444-0000-0000-0000-000000000004',1,0),
  ('55555555-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000005','44444444-0000-0000-0000-000000000005',1,1),
  ('55555555-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001',1,2)
on conflict do nothing;

-- ---------- promotions ----------
insert into promotions (name, type, value, code, min_subtotal_minor, stackable, priority, is_active, starts_at, ends_at) values
  ('Welcome 10%','percentage',10,'WELCOME10',0,false,10,true,now(),now()+interval '90 days'),
  ('Deal of the Day -15%','percentage',15,null,0,false,20,true,now(),now()+interval '1 day'),
  ('Free shipping over LKR 5,000','free_shipping',0,null,500000,true,5,true,now(),now()+interval '365 days')
on conflict (code) do nothing;

-- ---------- banners ----------
insert into banners (title, image_url, link_url, placement, position, is_active, starts_at, ends_at) values
  ('Back to School — up to 30% off','/images/banner-bts.jpg','/c/kids-corner','home_hero',1,true,now(),now()+interval '60 days'),
  ('New journals just landed','/images/banner-journals.jpg','/products/a5-dotted-notebook','home_hero',2,true,now(),now()+interval '60 days'),
  ('Free delivery over LKR 5,000',null,'/promotions','promo_strip',1,true,now(),now()+interval '365 days')
on conflict do nothing;

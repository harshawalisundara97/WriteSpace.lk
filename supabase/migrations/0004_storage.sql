-- Public bucket for product images. Uploads happen server-side via the
-- service-role key (admin product actions), so we only need public READ here.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public read of objects in this bucket.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'product_images_public_read'
  ) then
    create policy product_images_public_read on storage.objects
      for select using (bucket_id = 'product-images');
  end if;
end $$;

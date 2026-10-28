begin;

alter table public.products
    add column if not exists image_path text;

insert into storage.buckets (
    id, name, public, file_size_limit, allowed_mime_types
)
values (
    'product-images',
    'product-images',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
   set public = excluded.public,
       file_size_limit = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types;

create policy "managers can upload product images"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'product-images'
        and public.user_has_any_store_role(array['owner', 'manager'])
    );

create policy "managers can update product images"
    on storage.objects for update to authenticated
    using (
        bucket_id = 'product-images'
        and public.user_has_any_store_role(array['owner', 'manager'])
    )
    with check (
        bucket_id = 'product-images'
        and public.user_has_any_store_role(array['owner', 'manager'])
    );

create policy "managers can delete product images"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'product-images'
        and public.user_has_any_store_role(array['owner', 'manager'])
    );

commit;

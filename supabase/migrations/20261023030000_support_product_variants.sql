begin;

create or replace function public.add_product_variant(
    p_product_id uuid,
    p_sku text,
    p_variant_name text,
    p_unit_price numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_variant_id uuid;
begin
    if not public.user_has_any_store_role(array['owner', 'manager']) then
        raise exception 'Only store managers can manage the catalog'
            using errcode = '42501';
    end if;
    if p_product_id is null
       or p_sku is null or length(trim(p_sku)) = 0
       or p_unit_price is null or p_unit_price < 0 then
        raise exception 'Product, SKU, and non-negative price are required'
            using errcode = '22023';
    end if;
    if not exists (
        select 1 from public.products p
         where p.id = p_product_id and p.is_active
    ) then
        raise exception 'Product does not exist or is inactive'
            using errcode = '23503';
    end if;

    insert into public.product_variants (
        product_id, sku, variant_name, unit_price
    )
    values (
        p_product_id, trim(p_sku),
        nullif(trim(coalesce(p_variant_name, '')), ''),
        p_unit_price
    )
    returning id into v_variant_id;

    return v_variant_id;
end;
$$;

revoke all on function public.add_product_variant(uuid, text, text, numeric)
    from public, anon;
grant execute on function public.add_product_variant(uuid, text, text, numeric)
    to authenticated;

commit;

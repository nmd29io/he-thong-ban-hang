begin;

alter table public.sales_orders
    add column sales_channel text not null default 'pos',
    add constraint sales_orders_sales_channel_check
        check (sales_channel in ('pos', 'shop'));

create index sales_orders_shop_account_history_idx
    on public.sales_orders (created_by, created_at desc)
    where sales_channel = 'shop';

create or replace function public.create_storefront_order_for_user(
    p_store_id uuid,
    p_warehouse_id uuid,
    p_items jsonb,
    p_customer_name text,
    p_customer_phone text,
    p_shipping_address text,
    p_idempotency_key uuid,
    p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_order_id uuid;
    v_existing_user_id uuid;
    v_role text := coalesce(
        nullif(current_setting('request.jwt.claim.role', true), ''),
        nullif(current_setting('role', true), '')
    );
begin
    if v_role <> 'service_role' then
        raise exception 'Storefront order creation is restricted to the server'
            using errcode = '42501';
    end if;
    if p_user_id is null then
        raise exception 'An authenticated account is required'
            using errcode = '22023';
    end if;

    select created_by
      into v_existing_user_id
      from public.sales_orders
     where idempotency_key = p_idempotency_key;

    if found and v_existing_user_id is distinct from p_user_id then
        raise exception 'Order is already linked to another account'
            using errcode = '42501';
    end if;

    v_order_id := public.create_storefront_order(
        p_store_id,
        p_warehouse_id,
        p_items,
        p_customer_name,
        p_customer_phone,
        p_shipping_address,
        p_idempotency_key
    );

    update public.sales_orders
       set created_by = p_user_id,
           sales_channel = 'shop'
     where id = v_order_id
       and (created_by is null or created_by = p_user_id);

    if not found then
        raise exception 'Order is already linked to another account'
            using errcode = '42501';
    end if;

    return v_order_id;
end;
$$;

revoke all on function public.create_storefront_order_for_user(
    uuid, uuid, jsonb, text, text, text, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.create_storefront_order_for_user(
    uuid, uuid, jsonb, text, text, text, uuid, uuid
) to service_role;

drop policy if exists "members can read sales orders" on public.sales_orders;
create policy "members can read sales orders"
    on public.sales_orders for select to authenticated
    using (
        created_by = (select auth.uid())
        or public.user_has_store_permission(store_id, 'orders.read')
        or public.user_has_store_permission(store_id, 'orders.manage')
        or public.user_has_store_permission(store_id, 'payments.read')
        or public.user_has_store_permission(store_id, 'payments.manage')
        or public.user_has_store_permission(store_id, 'sales.create')
    );

drop policy if exists "members can read order items" on public.sales_order_items;
create policy "members can read order items"
    on public.sales_order_items for select to authenticated
    using (
        exists (
            select 1
              from public.sales_orders o
             where o.id = order_id
               and (
                   o.created_by = (select auth.uid())
                   or public.user_has_store_permission(o.store_id, 'orders.read')
                   or public.user_has_store_permission(o.store_id, 'orders.manage')
                   or public.user_has_store_permission(o.store_id, 'payments.read')
                   or public.user_has_store_permission(o.store_id, 'payments.manage')
                   or public.user_has_store_permission(o.store_id, 'sales.create')
               )
        )
    );

commit;

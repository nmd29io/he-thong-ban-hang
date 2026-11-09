begin;

alter table public.sales_orders
    drop constraint if exists sales_orders_status_check,
    add constraint sales_orders_status_check
        check (status in (
            'draft', 'pending_confirmation', 'confirmed', 'cancelled', 'fulfilled'
        ));

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
           sales_channel = 'shop',
           status = case
               when created_by is null and status = 'confirmed'
                   then 'pending_confirmation'
               else status
           end
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

create or replace function public.confirm_storefront_order(
    p_store_id uuid,
    p_order_id uuid,
    p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_order public.sales_orders%rowtype;
begin
    if not exists (
        select 1
          from public.store_memberships m
         where m.store_id = p_store_id
           and m.user_id = p_actor_id
           and m.is_active
           and m.role in ('owner', 'manager', 'cashier')
    ) then
        raise exception 'User is not allowed to confirm orders'
            using errcode = '42501';
    end if;

    select *
      into v_order
      from public.sales_orders o
     where o.id = p_order_id
       and o.store_id = p_store_id
     for update;
    if not found then
        raise exception 'Order does not belong to this store'
            using errcode = 'P0002';
    end if;
    if v_order.sales_channel <> 'shop'
       or v_order.status <> 'pending_confirmation' then
        raise exception 'Only pending storefront orders can be confirmed'
            using errcode = '55000';
    end if;
    if not exists (
        select 1
          from public.sales_order_items i
         where i.order_id = p_order_id
    ) or exists (
        select 1
          from public.sales_order_items i
          left join public.inventory_reservations r
            on r.order_item_id = i.id
           and r.order_id = i.order_id
           and r.variant_id = i.variant_id
           and r.warehouse_id = v_order.warehouse_id
           and r.quantity = i.quantity
           and r.status = 'active'
         where i.order_id = p_order_id
           and r.id is null
    ) then
        raise exception 'Active inventory reservation is missing'
            using errcode = '23514';
    end if;

    update public.sales_orders
       set status = 'confirmed',
           updated_at = now()
     where id = p_order_id;

    return p_order_id;
end;
$$;

revoke all on function public.confirm_storefront_order(uuid, uuid, uuid)
    from public, anon, authenticated;
grant execute on function public.confirm_storefront_order(uuid, uuid, uuid)
    to service_role;

create or replace function public.cancel_order_release_stock(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_order public.sales_orders%rowtype;
    v_item record;
    v_balance_reserved bigint;
begin
    select *
      into v_order
      from public.sales_orders
     where id = p_order_id
     for update;

    if not found then
        raise exception 'Order % does not exist', p_order_id
            using errcode = 'P0002';
    end if;

    if v_order.status = 'cancelled' then
        return p_order_id;
    end if;

    if v_order.status not in ('confirmed', 'pending_confirmation') then
        raise exception 'Only confirmed or pending storefront orders can be cancelled; status is %',
            v_order.status
            using errcode = '55000';
    end if;

    for v_item in
        select r.variant_id,
               r.warehouse_id,
               sum(r.quantity)::bigint as release_qty
          from public.inventory_reservations r
         where r.order_id = p_order_id
           and r.status = 'active'
         group by r.variant_id, r.warehouse_id
         order by r.warehouse_id, r.variant_id
    loop
        select b.reserved
          into v_balance_reserved
          from public.inventory_balances b
         where b.warehouse_id = v_item.warehouse_id
           and b.variant_id = v_item.variant_id
         for update;

        if not found then
            raise exception 'Inventory balance is missing for variant %',
                v_item.variant_id
                using errcode = '23503';
        end if;

        if v_balance_reserved < v_item.release_qty then
            raise exception
                'Inventory reservation invariant violated for variant %',
                v_item.variant_id
                using errcode = '23514';
        end if;
    end loop;

    for v_item in
        select r.variant_id,
               r.warehouse_id,
               sum(r.quantity)::bigint as release_qty
          from public.inventory_reservations r
         where r.order_id = p_order_id
           and r.status = 'active'
         group by r.variant_id, r.warehouse_id
         order by r.warehouse_id, r.variant_id
    loop
        update public.inventory_balances
           set reserved = reserved - v_item.release_qty,
               updated_at = now()
         where warehouse_id = v_item.warehouse_id
           and variant_id = v_item.variant_id;
    end loop;

    update public.inventory_reservations
       set status = 'released',
           updated_at = now()
     where order_id = p_order_id
       and status = 'active';

    update public.sales_orders
       set status = 'cancelled',
           updated_at = now()
     where id = p_order_id;

    return p_order_id;
end;
$$;

revoke all on function public.cancel_order_release_stock(uuid)
    from public, anon, authenticated;
grant execute on function public.cancel_order_release_stock(uuid)
    to service_role;

commit;

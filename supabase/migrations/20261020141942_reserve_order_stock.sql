
begin;

create or replace function public.reserve_order_stock(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_order public.sales_orders%rowtype;
    v_item record;
    v_on_hand bigint;
    v_reserved bigint;
    v_available bigint;
begin
    -- Serialize requests attempting to confirm the same order.
    select *
      into v_order
      from public.sales_orders
     where id = p_order_id
     for update;

    if not found then
        raise exception 'Order % does not exist', p_order_id
            using errcode = 'P0002';
    end if;

    if v_order.status <> 'draft' then
        raise exception 'Order % is not in draft status', p_order_id
            using errcode = '55000';
    end if;

    if not exists (
        select 1
          from public.sales_order_items
         where order_id = p_order_id
    ) then
        raise exception 'Cannot confirm an order without items'
            using errcode = '23514';
    end if;

    if exists (
        select 1
          from public.inventory_reservations
         where order_id = p_order_id
    ) then
        raise exception 'Order already has reservations'
            using errcode = '23505';
    end if;

    /*
     * Lock inventory rows in deterministic variant order.
     * Aggregate quantities first so duplicate SKU lines cannot
     * collectively reserve more than the available stock.
     *
     * Missing inventory balance rows are treated as an error.
     */
    for v_item in
        select i.variant_id, sum(i.quantity)::numeric as required_qty
          from public.sales_order_items i
         where i.order_id = p_order_id
         group by i.variant_id
         order by i.variant_id
    loop
        select b.on_hand, b.reserved
          into v_on_hand, v_reserved
          from public.inventory_balances b
         where b.warehouse_id = v_order.warehouse_id
           and b.variant_id = v_item.variant_id
         for update;

        if not found then
            raise exception
                'No inventory balance for warehouse %, variant %',
                v_order.warehouse_id, v_item.variant_id
                using errcode = '23503';
        end if;

        v_available := v_on_hand - v_reserved;

        if v_item.required_qty > v_available then
            raise exception
                'Insufficient stock for variant %. Required: %, available: %',
                v_item.variant_id, v_item.required_qty, v_available
                using errcode = '23514';
        end if;
    end loop;

    -- All SKUs passed validation. Increase reserved quantities.
    for v_item in
        select i.variant_id, sum(i.quantity)::bigint as required_qty
          from public.sales_order_items i
         where i.order_id = p_order_id
         group by i.variant_id
         order by i.variant_id
    loop
        update public.inventory_balances
           set reserved = reserved + v_item.required_qty,
               updated_at = now()
         where warehouse_id = v_order.warehouse_id
           and variant_id = v_item.variant_id;
    end loop;

    -- Create one reservation for each order line.
    insert into public.inventory_reservations (
        order_id,
        order_item_id,
        warehouse_id,
        variant_id,
        quantity,
        status
    )
    select
        i.order_id,
        i.id,
        v_order.warehouse_id,
        i.variant_id,
        i.quantity,
        'active'
    from public.sales_order_items i
    where i.order_id = p_order_id;

    update public.sales_orders
       set status = 'confirmed',
           updated_at = now()
     where id = p_order_id;

    return p_order_id;
end;
$$;

-- Do not expose this privileged function to browser-facing roles.
revoke all on function public.reserve_order_stock(uuid)
    from public, anon, authenticated;

grant execute on function public.reserve_order_stock(uuid)
    to service_role;

commit;

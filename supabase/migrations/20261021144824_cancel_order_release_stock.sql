
begin;

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
    -- Serialize cancellation and confirmation for the same order.
    select *
      into v_order
      from public.sales_orders
     where id = p_order_id
     for update;

    if not found then
        raise exception 'Order % does not exist', p_order_id
            using errcode = 'P0002';
    end if;

    -- Idempotent retry: an already cancelled order changes nothing.
    if v_order.status = 'cancelled' then
        return p_order_id;
    end if;

    if v_order.status <> 'confirmed' then
        raise exception 'Only confirmed orders can be cancelled; status is %',
            v_order.status
            using errcode = '55000';
    end if;

    -- Lock every affected inventory row in deterministic SKU order.
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

    -- Release only reservations that are still active.
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

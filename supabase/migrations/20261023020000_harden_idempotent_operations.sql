begin;

create or replace function public.record_inventory_movement(
    p_store_id uuid,
    p_warehouse_id uuid,
    p_variant_id uuid,
    p_quantity_delta bigint,
    p_event_type text,
    p_actor_id uuid,
    p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_ledger_id uuid;
    v_balance public.inventory_balances%rowtype;
    v_existing public.inventory_ledger%rowtype;
begin
    if p_quantity_delta is null or p_quantity_delta = 0
       or p_event_type is null
       or p_event_type not in ('receipt', 'adjustment') then
        raise exception 'Invalid inventory movement'
            using errcode = '22023';
    end if;
    if p_idempotency_key is null then
        raise exception 'Inventory movement requires an idempotency key'
            using errcode = '22023';
    end if;
    if p_event_type = 'receipt' and p_quantity_delta < 0 then
        raise exception 'Stock receipts must increase inventory'
            using errcode = '22023';
    end if;

    if not exists (
        select 1 from public.store_memberships m
         where m.store_id = p_store_id and m.user_id = p_actor_id
           and m.is_active and m.role in ('owner', 'manager', 'stock_clerk')
    ) then
        raise exception 'User is not allowed to manage inventory'
            using errcode = '42501';
    end if;

    perform pg_advisory_xact_lock(hashtext(p_idempotency_key::text));
    select * into v_existing
      from public.inventory_ledger l
     where l.idempotency_key = p_idempotency_key::text;
    if found then
        if v_existing.warehouse_id <> p_warehouse_id
           or v_existing.variant_id <> p_variant_id
           or v_existing.quantity_delta <> p_quantity_delta
           or v_existing.event_type <> p_event_type then
            raise exception 'Idempotency key was reused with different inventory data'
                using errcode = '23505';
        end if;
        return v_existing.id;
    end if;

    if not exists (
        select 1 from public.warehouses w
         where w.id = p_warehouse_id and w.store_id = p_store_id and w.is_active
    ) then
        raise exception 'Warehouse is not available for this store'
            using errcode = '23503';
    end if;

    insert into public.inventory_balances (warehouse_id, variant_id, on_hand, reserved)
    values (p_warehouse_id, p_variant_id, 0, 0)
    on conflict (warehouse_id, variant_id) do nothing;

    select * into v_balance
      from public.inventory_balances b
     where b.warehouse_id = p_warehouse_id
       and b.variant_id = p_variant_id
     for update;
    if not found then
        raise exception 'Product variant does not exist'
            using errcode = '23503';
    end if;
    if v_balance.on_hand + p_quantity_delta < v_balance.reserved then
        raise exception 'Inventory cannot be reduced below reserved stock'
            using errcode = '23514';
    end if;

    update public.inventory_balances
       set on_hand = on_hand + p_quantity_delta,
           updated_at = now()
     where warehouse_id = p_warehouse_id
       and variant_id = p_variant_id;

    insert into public.inventory_ledger (
        warehouse_id, variant_id, event_type, quantity_delta,
        reference_type, reference_id, idempotency_key, metadata
    )
    values (
        p_warehouse_id, p_variant_id, p_event_type, p_quantity_delta,
        'manual', p_actor_id, p_idempotency_key::text,
        jsonb_build_object('store_id', p_store_id, 'actor_id', p_actor_id)
    )
    returning id into v_ledger_id;

    return v_ledger_id;
end;
$$;

create or replace function public.record_order_payment(
    p_store_id uuid,
    p_order_id uuid,
    p_amount numeric,
    p_payment_method text,
    p_actor_id uuid,
    p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_order public.sales_orders%rowtype;
    v_paid numeric(18, 2);
    v_payment_id uuid;
    v_existing public.payments%rowtype;
begin
    if p_amount is null or p_amount <= 0
       or p_payment_method not in ('cash', 'bank_transfer') then
        raise exception 'Invalid payment amount or method'
            using errcode = '22023';
    end if;
    if p_idempotency_key is null then
        raise exception 'Payment requires an idempotency key'
            using errcode = '22023';
    end if;

    if not exists (
        select 1 from public.store_memberships m
         where m.store_id = p_store_id and m.user_id = p_actor_id
           and m.is_active and m.role in ('owner', 'manager', 'cashier', 'accountant')
    ) then
        raise exception 'User is not allowed to record payments'
            using errcode = '42501';
    end if;

    perform pg_advisory_xact_lock(hashtext(p_idempotency_key::text));
    select * into v_existing
      from public.payments p
     where p.idempotency_key = p_idempotency_key;
    if found then
        if v_existing.order_id <> p_order_id
           or v_existing.amount <> p_amount
           or v_existing.payment_method <> p_payment_method
           or not exists (
               select 1 from public.sales_orders o
                where o.id = v_existing.order_id and o.store_id = p_store_id
           ) then
            raise exception 'Idempotency key was reused with different payment data'
                using errcode = '23505';
        end if;
        return v_existing.id;
    end if;

    select * into v_order
      from public.sales_orders o
     where o.id = p_order_id and o.store_id = p_store_id
     for update;
    if not found or v_order.status not in ('confirmed', 'fulfilled') then
        raise exception 'Order is not available for payment'
            using errcode = '55000';
    end if;

    select coalesce(sum(p.amount), 0) into v_paid
      from public.payments p
     where p.order_id = p_order_id and p.status = 'succeeded';
    if v_paid + p_amount > v_order.total_amount then
        raise exception 'Payment exceeds the remaining order balance'
            using errcode = '23514';
    end if;

    insert into public.payments (
        order_id, provider, amount, currency, status, payment_method,
        received_by, idempotency_key
    )
    values (
        p_order_id, 'manual', p_amount, v_order.currency, 'succeeded',
        p_payment_method, p_actor_id, p_idempotency_key
    )
    returning id into v_payment_id;
    return v_payment_id;
end;
$$;

drop policy "members can read sales orders" on public.sales_orders;
create policy "members can read sales orders"
    on public.sales_orders for select to authenticated
    using (public.user_has_store_role(
        store_id, array['owner', 'manager', 'cashier', 'accountant']
    ));

drop policy "members can read order items" on public.sales_order_items;
create policy "members can read order items"
    on public.sales_order_items for select to authenticated
    using (exists (
        select 1 from public.sales_orders o
         where o.id = order_id
           and public.user_has_store_role(
               o.store_id, array['owner', 'manager', 'cashier', 'accountant']
           )
    ));

drop policy "members can read reservations" on public.inventory_reservations;
create policy "members can read reservations"
    on public.inventory_reservations for select to authenticated
    using (exists (
        select 1 from public.sales_orders o
         where o.id = order_id
           and public.user_has_store_role(
               o.store_id, array['owner', 'manager', 'cashier', 'stock_clerk']
           )
    ));

drop policy "members can read inventory ledger" on public.inventory_ledger;
create policy "members can read inventory ledger"
    on public.inventory_ledger for select to authenticated
    using (exists (
        select 1 from public.warehouses w
         where w.id = warehouse_id
           and public.user_has_store_role(
               w.store_id, array['owner', 'manager', 'stock_clerk', 'accountant']
           )
    ));

drop policy "members can read payments" on public.payments;
create policy "members can read payments"
    on public.payments for select to authenticated
    using (exists (
        select 1 from public.sales_orders o
         where o.id = order_id
           and public.user_has_store_role(
               o.store_id, array['owner', 'manager', 'cashier', 'accountant']
           )
    ));

drop policy "members can read customers" on public.customers;
create policy "members can read customers"
    on public.customers for select to authenticated
    using (public.user_has_store_role(
        store_id, array['owner', 'manager', 'cashier', 'accountant']
    ));

create or replace function public.get_store_report(
    p_store_id uuid,
    p_from timestamptz,
    p_until timestamptz
)
returns table (
    sales_total numeric,
    order_count bigint,
    paid_total numeric,
    unpaid_total numeric,
    low_stock_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if not public.user_has_store_role(
        p_store_id, array['owner', 'manager', 'accountant']
    ) then
        raise exception 'User is not allowed to view this report'
            using errcode = '42501';
    end if;
    if p_from is null or p_until is null or p_until <= p_from then
        raise exception 'Report date range is invalid'
            using errcode = '22023';
    end if;

    return query
    with scoped_orders as (
        select o.id, o.total_amount
          from public.sales_orders o
         where o.store_id = p_store_id
           and o.created_at >= p_from and o.created_at < p_until
           and o.status in ('confirmed', 'fulfilled')
    ),
    order_totals as (
        select coalesce(sum(s.total_amount), 0)::numeric as total,
               count(*)::bigint as count
          from scoped_orders s
    ),
    payment_totals as (
        select coalesce(sum(p.amount), 0)::numeric as total
          from public.payments p
          join scoped_orders s on s.id = p.order_id
         where p.status = 'succeeded'
    ),
    stock_totals as (
        select count(*)::bigint as count
          from public.inventory_balances b
          join public.warehouses w on w.id = b.warehouse_id
         where w.store_id = p_store_id and w.is_active
           and b.on_hand - b.reserved <= 3
    )
    select o.total, o.count, p.total,
           greatest(o.total - p.total, 0)::numeric, s.count
      from order_totals o
      cross join payment_totals p
      cross join stock_totals s;
end;
$$;

commit;

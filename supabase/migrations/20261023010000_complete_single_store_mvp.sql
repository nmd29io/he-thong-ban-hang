begin;

alter table public.product_variants
    add column if not exists unit_price numeric(18, 2) not null default 0
    check (unit_price >= 0);

create table if not exists public.store_memberships (
    store_id uuid not null references public.stores(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in (
        'owner', 'manager', 'cashier', 'stock_clerk', 'accountant'
    )),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    primary key (store_id, user_id)
);

create table if not exists public.customers (
    id uuid primary key default gen_random_uuid(),
    store_id uuid not null references public.stores(id),
    name text not null,
    phone text,
    email text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, store_id),
    constraint customers_name_not_blank check (length(trim(name)) > 0)
);

create index if not exists customers_store_name_idx
    on public.customers(store_id, name);

alter table public.sales_orders
    add column if not exists customer_id uuid,
    add column if not exists created_by uuid references auth.users(id),
    add column if not exists idempotency_key uuid unique,
    add column if not exists idempotency_payload jsonb;

alter table public.sales_orders
    add constraint sales_orders_customer_store_fk
    foreign key (customer_id, store_id)
    references public.customers(id, store_id);

alter table public.payments
    add column if not exists payment_method text not null default 'cash'
        check (payment_method in ('cash', 'bank_transfer')),
    add column if not exists received_by uuid references auth.users(id),
    add column if not exists idempotency_key uuid unique;

alter table public.store_memberships enable row level security;
alter table public.customers enable row level security;

create or replace function public.user_has_store_role(
    p_store_id uuid,
    p_roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
          from public.store_memberships m
         where m.store_id = p_store_id
           and m.user_id = (select auth.uid())
           and m.is_active
           and (p_roles is null or m.role = any(p_roles))
    );
$$;

create or replace function public.user_has_any_store_role(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
          from public.store_memberships m
         where m.user_id = (select auth.uid())
           and m.is_active
           and m.role = any(p_roles)
    );
$$;

create or replace function public.set_store_membership(
    p_store_id uuid,
    p_user_id uuid,
    p_role text,
    p_is_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_existing_role text;
begin
    if not public.user_has_store_role(p_store_id, array['owner']) then
        raise exception 'Only store owners can manage memberships'
            using errcode = '42501';
    end if;
    if p_role not in ('owner', 'manager', 'cashier', 'stock_clerk', 'accountant') then
        raise exception 'Unsupported store role'
            using errcode = '22023';
    end if;
    if p_user_id is null or not exists (
        select 1 from auth.users u where u.id = p_user_id
    ) then
        raise exception 'User account does not exist'
            using errcode = '23503';
    end if;
    perform pg_advisory_xact_lock(hashtext('store-owner:' || p_store_id::text));
    select m.role into v_existing_role
      from public.store_memberships m
     where m.store_id = p_store_id and m.user_id = p_user_id
       and m.is_active
     for update;

    if v_existing_role = 'owner'
       and (p_role <> 'owner' or not p_is_active)
       and (
           select count(*) from public.store_memberships m
            where m.store_id = p_store_id and m.role = 'owner' and m.is_active
       ) <= 1 then
        raise exception 'A store must have at least one active owner'
            using errcode = '23514';
    end if;

    insert into public.store_memberships (store_id, user_id, role, is_active)
    values (p_store_id, p_user_id, p_role, p_is_active)
    on conflict (store_id, user_id) do update
       set role = excluded.role,
           is_active = excluded.is_active;
end;
$$;

create or replace function public.create_catalog_item(
    p_name text,
    p_sku text,
    p_variant_name text,
    p_unit_price numeric,
    p_description text default null
)
returns table (product_id uuid, variant_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_product_id uuid;
    v_variant_id uuid;
begin
    if not public.user_has_any_store_role(array['owner', 'manager']) then
        raise exception 'Only store managers can manage the catalog'
            using errcode = '42501';
    end if;
    if p_name is null or length(trim(p_name)) = 0
       or p_sku is null or length(trim(p_sku)) = 0
       or p_unit_price is null or p_unit_price < 0 then
        raise exception 'Product name, SKU, and non-negative price are required'
            using errcode = '22023';
    end if;

    insert into public.products (name, description)
    values (trim(p_name), nullif(trim(coalesce(p_description, '')), ''))
    returning id into v_product_id;

    insert into public.product_variants (
        product_id, sku, variant_name, unit_price
    )
    values (
        v_product_id,
        trim(p_sku),
        nullif(trim(coalesce(p_variant_name, '')), ''),
        p_unit_price
    )
    returning id into v_variant_id;

    return query select v_product_id, v_variant_id;
end;
$$;

create or replace function public.cancel_sales_order(
    p_store_id uuid,
    p_order_id uuid,
    p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not exists (
        select 1 from public.store_memberships m
         where m.store_id = p_store_id and m.user_id = p_actor_id
           and m.is_active and m.role in ('owner', 'manager', 'cashier')
    ) then
        raise exception 'User is not allowed to cancel orders'
            using errcode = '42501';
    end if;
    if not exists (
        select 1 from public.sales_orders o
         where o.id = p_order_id and o.store_id = p_store_id
    ) then
        raise exception 'Order does not belong to this store'
            using errcode = 'P0002';
    end if;
    return public.cancel_order_release_stock(p_order_id);
end;
$$;

revoke all on function public.user_has_store_role(uuid, text[]) from public;
revoke all on function public.user_has_any_store_role(text[]) from public;
grant execute on function public.user_has_store_role(uuid, text[])
    to authenticated, service_role;
grant execute on function public.user_has_any_store_role(text[])
    to authenticated, service_role;
revoke all on function public.set_store_membership(uuid, uuid, text, boolean)
    from public, anon;
grant execute on function public.set_store_membership(uuid, uuid, text, boolean)
    to authenticated;
revoke all on function public.create_catalog_item(text, text, text, numeric, text)
    from public, anon;
grant execute on function public.create_catalog_item(text, text, text, numeric, text)
    to authenticated;

grant select on public.store_memberships to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_variants to authenticated;
grant select on public.stores, public.warehouses,
    public.inventory_balances, public.sales_orders, public.sales_order_items,
    public.inventory_reservations, public.inventory_ledger, public.payments
    to authenticated;

create policy "members can read their store memberships"
    on public.store_memberships for select to authenticated
    using (
        user_id = (select auth.uid())
        or public.user_has_store_role(store_id, array['owner', 'manager'])
    );

create policy "members can read their stores"
    on public.stores for select to authenticated
    using (public.user_has_store_role(id));

create policy "members can read their warehouses"
    on public.warehouses for select to authenticated
    using (public.user_has_store_role(store_id));

create policy "members can read products"
    on public.products for select to authenticated
    using (public.user_has_any_store_role(
        array['owner', 'manager', 'cashier', 'stock_clerk', 'accountant']
    ));

create policy "managers can manage products"
    on public.products for all to authenticated
    using (public.user_has_any_store_role(array['owner', 'manager']))
    with check (public.user_has_any_store_role(array['owner', 'manager']));

create policy "members can read product variants"
    on public.product_variants for select to authenticated
    using (public.user_has_any_store_role(
        array['owner', 'manager', 'cashier', 'stock_clerk', 'accountant']
    ));

create policy "managers can manage product variants"
    on public.product_variants for all to authenticated
    using (public.user_has_any_store_role(array['owner', 'manager']))
    with check (public.user_has_any_store_role(array['owner', 'manager']));

create policy "members can read inventory balances"
    on public.inventory_balances for select to authenticated
    using (exists (
        select 1
          from public.warehouses w
         where w.id = warehouse_id
           and public.user_has_store_role(w.store_id)
    ));

create policy "members can read sales orders"
    on public.sales_orders for select to authenticated
    using (public.user_has_store_role(
        store_id, array['owner', 'manager', 'cashier', 'accountant']
    ));

create policy "members can read order items"
    on public.sales_order_items for select to authenticated
    using (exists (
        select 1
          from public.sales_orders o
         where o.id = order_id
            and public.user_has_store_role(
                o.store_id, array['owner', 'manager', 'cashier', 'accountant']
            )
    ));

create policy "members can read reservations"
    on public.inventory_reservations for select to authenticated
    using (exists (
        select 1
          from public.sales_orders o
         where o.id = order_id
            and public.user_has_store_role(
                o.store_id, array['owner', 'manager', 'cashier', 'stock_clerk']
            )
    ));

create policy "members can read inventory ledger"
    on public.inventory_ledger for select to authenticated
    using (exists (
        select 1
          from public.warehouses w
         where w.id = warehouse_id
            and public.user_has_store_role(
                w.store_id, array['owner', 'manager', 'stock_clerk', 'accountant']
            )
    ));

create policy "members can read payments"
    on public.payments for select to authenticated
    using (exists (
        select 1
          from public.sales_orders o
         where o.id = order_id
            and public.user_has_store_role(
                o.store_id, array['owner', 'manager', 'cashier', 'accountant']
            )
    ));

create policy "members can read customers"
    on public.customers for select to authenticated
    using (public.user_has_store_role(
        store_id, array['owner', 'manager', 'cashier', 'accountant']
    ));

create policy "sales staff can add customers"
    on public.customers for insert to authenticated
    with check (public.user_has_store_role(
        store_id, array['owner', 'manager', 'cashier']
    ));

create policy "sales staff can update customers"
    on public.customers for update to authenticated
    using (public.user_has_store_role(
        store_id, array['owner', 'manager', 'cashier']
    ))
    with check (public.user_has_store_role(
        store_id, array['owner', 'manager', 'cashier']
    ));

create policy "managers can delete customers"
    on public.customers for delete to authenticated
    using (public.user_has_store_role(store_id, array['owner', 'manager']));

create or replace function public.create_and_reserve_order(
    p_store_id uuid,
    p_warehouse_id uuid,
    p_items jsonb,
    p_actor_id uuid,
    p_customer_id uuid default null,
    p_paid_amount numeric default 0,
    p_payment_method text default 'cash',
    p_idempotency_key uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_order_id uuid;
    v_existing_payload jsonb;
    v_payload jsonb;
    v_item record;
    v_subtotal numeric(18, 2);
    v_paid_amount numeric(18, 2) := coalesce(p_paid_amount, 0);
begin
    if p_items is null or jsonb_typeof(p_items) <> 'array'
       or jsonb_array_length(p_items) < 1
       or jsonb_array_length(p_items) > 100 then
        raise exception 'Order must contain between 1 and 100 items'
            using errcode = '22023';
    end if;

    if p_payment_method not in ('cash', 'bank_transfer') then
        raise exception 'Unsupported payment method'
            using errcode = '22023';
    end if;

    if v_paid_amount < 0 then
        raise exception 'Payment amount cannot be negative'
            using errcode = '22023';
    end if;

    if not exists (
        select 1
          from public.store_memberships m
         where m.store_id = p_store_id
           and m.user_id = p_actor_id
           and m.is_active
           and m.role in ('owner', 'manager', 'cashier')
    ) then
        raise exception 'User is not allowed to create orders for this store'
            using errcode = '42501';
    end if;

    if not exists (
        select 1
          from public.warehouses w
         where w.id = p_warehouse_id
           and w.store_id = p_store_id
           and w.is_active
    ) then
        raise exception 'Warehouse is not available for this store'
            using errcode = '23503';
    end if;

    if p_customer_id is not null and not exists (
        select 1
          from public.customers c
         where c.id = p_customer_id
           and c.store_id = p_store_id
    ) then
        raise exception 'Customer does not belong to this store'
            using errcode = '23503';
    end if;

    if exists (
        select 1
          from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity bigint)
         where x.variant_id is null or x.quantity is null
            or x.quantity <= 0
    ) then
        raise exception 'Order items contain invalid SKU or quantity'
            using errcode = '22023';
    end if;

    if exists (
        select 1
          from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity bigint)
          left join public.product_variants v on v.id = x.variant_id
          left join public.products p on p.id = v.product_id
         where v.id is null or not v.is_active or p.id is null or not p.is_active
    ) then
        raise exception 'An order item is inactive or does not exist'
            using errcode = '23503';
    end if;

    select coalesce(sum(x.quantity * v.unit_price), 0)::numeric(18, 2)
      into v_subtotal
      from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity bigint)
      join public.product_variants v on v.id = x.variant_id;

    if v_paid_amount > v_subtotal then
        raise exception 'Payment cannot exceed the order total'
            using errcode = '23514';
    end if;

    select jsonb_build_object(
        'store_id', p_store_id,
        'warehouse_id', p_warehouse_id,
        'customer_id', p_customer_id,
        'items', (
            select jsonb_agg(
                jsonb_build_object('variant_id', x.variant_id, 'quantity', x.quantity)
                order by x.variant_id, x.quantity
            )
              from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity bigint)
        ),
        'paid_amount', v_paid_amount,
        'payment_method', p_payment_method
    ) into v_payload;

    if p_idempotency_key is not null then
        perform pg_advisory_xact_lock(hashtext(p_idempotency_key::text));

        select o.id, o.idempotency_payload
          into v_order_id, v_existing_payload
          from public.sales_orders o
         where o.idempotency_key = p_idempotency_key
         for update;

        if found then
            if v_existing_payload is distinct from v_payload then
                raise exception 'Idempotency key was reused with different order data'
                    using errcode = '23505';
            end if;
            return v_order_id;
        end if;
    end if;

    insert into public.sales_orders (
        order_number, store_id, warehouse_id, customer_id, created_by,
        status, currency, subtotal, total_amount, idempotency_key,
        idempotency_payload
    )
    values (
        'SO-' || to_char(now(), 'YYYYMMDD') || '-'
            || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
        p_store_id, p_warehouse_id, p_customer_id, p_actor_id,
        'draft', 'VND', v_subtotal, v_subtotal, p_idempotency_key, v_payload
    )
    returning id into v_order_id;

    for v_item in
        select x.variant_id, x.quantity, v.unit_price
          from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity bigint)
          join public.product_variants v on v.id = x.variant_id
    loop
        insert into public.sales_order_items (
            order_id, variant_id, quantity, unit_price
        )
        values (v_order_id, v_item.variant_id, v_item.quantity, v_item.unit_price);
    end loop;

    perform public.reserve_order_stock(v_order_id);

    if v_paid_amount > 0 then
        insert into public.payments (
            order_id, provider, amount, currency, status, payment_method,
            received_by, idempotency_key
        )
        values (
            v_order_id, 'manual', v_paid_amount, 'VND', 'succeeded',
            p_payment_method, p_actor_id,
            case when p_idempotency_key is null then null
                 else p_idempotency_key end
        );
    end if;

    return v_order_id;
end;
$$;

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
        select 1
          from public.store_memberships m
         where m.store_id = p_store_id
           and m.user_id = p_actor_id
           and m.is_active
           and m.role in ('owner', 'manager', 'stock_clerk')
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

create or replace function public.complete_sales_order(
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
    v_item record;
    v_reserved bigint;
begin
    if not exists (
        select 1 from public.store_memberships m
         where m.store_id = p_store_id and m.user_id = p_actor_id
           and m.is_active and m.role in ('owner', 'manager', 'cashier')
    ) then
        raise exception 'User is not allowed to complete orders'
            using errcode = '42501';
    end if;

    select * into v_order
      from public.sales_orders o
     where o.id = p_order_id and o.store_id = p_store_id
     for update;
    if not found then
        raise exception 'Order does not exist' using errcode = 'P0002';
    end if;
    if v_order.status = 'fulfilled' then
        return p_order_id;
    end if;
    if v_order.status <> 'confirmed' then
        raise exception 'Only confirmed orders can be completed'
            using errcode = '55000';
    end if;

    for v_item in
        select r.variant_id, r.warehouse_id, sum(r.quantity)::bigint as quantity
          from public.inventory_reservations r
         where r.order_id = p_order_id and r.status = 'active'
         group by r.variant_id, r.warehouse_id
         order by r.warehouse_id, r.variant_id
    loop
        select b.reserved into v_reserved
          from public.inventory_balances b
         where b.warehouse_id = v_item.warehouse_id
           and b.variant_id = v_item.variant_id
         for update;
        if not found or v_reserved < v_item.quantity then
            raise exception 'Active inventory reservation is missing'
                using errcode = '23514';
        end if;
    end loop;

    for v_item in
        select r.variant_id, r.warehouse_id, sum(r.quantity)::bigint as quantity
          from public.inventory_reservations r
         where r.order_id = p_order_id and r.status = 'active'
         group by r.variant_id, r.warehouse_id
         order by r.warehouse_id, r.variant_id
    loop
        update public.inventory_balances
           set on_hand = on_hand - v_item.quantity,
               reserved = reserved - v_item.quantity,
               updated_at = now()
         where warehouse_id = v_item.warehouse_id
           and variant_id = v_item.variant_id;

        insert into public.inventory_ledger (
            warehouse_id, variant_id, event_type, quantity_delta,
            reference_type, reference_id, idempotency_key
        )
        values (
            v_item.warehouse_id, v_item.variant_id, 'sale', -v_item.quantity,
            'sales_order', p_order_id,
            'order:' || p_order_id::text || ':variant:' || v_item.variant_id::text
        )
        on conflict (idempotency_key) do nothing;
    end loop;

    update public.inventory_reservations
       set status = 'consumed', updated_at = now()
     where order_id = p_order_id and status = 'active';

    update public.sales_orders
       set status = 'fulfilled', updated_at = now()
     where id = p_order_id;

    return p_order_id;
end;
$$;

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

create or replace function public.get_store_recommendations(
    p_store_id uuid,
    p_limit integer default 5
)
returns table (
    variant_id uuid,
    product_name text,
    sku text,
    unit_price numeric,
    sold_quantity bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if not public.user_has_store_role(p_store_id) then
        raise exception 'User is not allowed to view recommendations'
            using errcode = '42501';
    end if;
    if p_limit < 1 or p_limit > 20 then
        raise exception 'Recommendation limit must be between 1 and 20'
            using errcode = '22023';
    end if;

    return query
    with sold as (
        select i.variant_id, sum(i.quantity)::bigint as quantity
          from public.sales_order_items i
          join public.sales_orders o on o.id = i.order_id
         where o.store_id = p_store_id
           and o.status in ('confirmed', 'fulfilled')
           and o.created_at >= now() - interval '90 days'
         group by i.variant_id
    ),
    stock as (
        select b.variant_id, sum(b.on_hand - b.reserved)::bigint as available
          from public.inventory_balances b
          join public.warehouses w on w.id = b.warehouse_id
         where w.store_id = p_store_id and w.is_active
         group by b.variant_id
    )
    select v.id, p.name, v.sku, v.unit_price, s.quantity
      from sold s
      join public.product_variants v on v.id = s.variant_id and v.is_active
      join public.products p on p.id = v.product_id and p.is_active
      join stock b on b.variant_id = v.id and b.available > 0
     order by s.quantity desc, p.name
     limit p_limit;
end;
$$;

revoke all on function public.create_and_reserve_order(
    uuid, uuid, jsonb, uuid, uuid, numeric, text, uuid
) from public, anon, authenticated;
revoke all on function public.record_inventory_movement(
    uuid, uuid, uuid, bigint, text, uuid, uuid
) from public, anon, authenticated;
revoke all on function public.record_order_payment(
    uuid, uuid, numeric, text, uuid, uuid
) from public, anon, authenticated;
revoke all on function public.complete_sales_order(uuid, uuid, uuid)
    from public, anon, authenticated;
revoke all on function public.cancel_sales_order(uuid, uuid, uuid)
    from public, anon, authenticated;
grant execute on function public.create_and_reserve_order(
    uuid, uuid, jsonb, uuid, uuid, numeric, text, uuid
) to service_role;
grant execute on function public.record_inventory_movement(
    uuid, uuid, uuid, bigint, text, uuid, uuid
) to service_role;
grant execute on function public.record_order_payment(
    uuid, uuid, numeric, text, uuid, uuid
) to service_role;
grant execute on function public.complete_sales_order(uuid, uuid, uuid)
    to service_role;
grant execute on function public.cancel_sales_order(uuid, uuid, uuid)
    to service_role;

revoke all on function public.get_store_report(uuid, timestamptz, timestamptz)
    from public, anon;
revoke all on function public.get_store_recommendations(uuid, integer)
    from public, anon;
grant execute on function public.get_store_report(uuid, timestamptz, timestamptz)
    to authenticated;
grant execute on function public.get_store_recommendations(uuid, integer)
    to authenticated;

commit;

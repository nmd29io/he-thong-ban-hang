begin;

alter table public.customers
    add column if not exists shipping_address text;

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
    ) and not (
        p_actor_id is null
        and coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
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
            p_payment_method, p_actor_id, p_idempotency_key
        );
    end if;

    return v_order_id;
end;
$$;

create or replace function public.create_storefront_order(
    p_store_id uuid,
    p_warehouse_id uuid,
    p_items jsonb,
    p_customer_name text,
    p_customer_phone text,
    p_shipping_address text,
    p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_order_id uuid;
    v_customer_id uuid;
    v_existing_payload jsonb;
    v_expected_payload jsonb;
    v_customer_name text := nullif(trim(p_customer_name), '');
    v_customer_phone text := nullif(trim(p_customer_phone), '');
    v_shipping_address text := nullif(trim(p_shipping_address), '');
begin
    if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
        raise exception 'Storefront order creation is restricted to the server'
            using errcode = '42501';
    end if;
    if not exists (
        select 1 from public.stores s
         where s.id = p_store_id and s.is_active
    ) then
        raise exception 'Store is not available for online orders'
            using errcode = '23503';
    end if;
    if p_idempotency_key is null
       or v_customer_name is null or length(v_customer_name) > 120
       or v_customer_phone is null or length(v_customer_phone) > 32
       or v_shipping_address is null or length(v_shipping_address) > 500 then
        raise exception 'Valid customer contact details and idempotency key are required'
            using errcode = '22023';
    end if;
    if p_items is null or jsonb_typeof(p_items) <> 'array'
       or jsonb_array_length(p_items) < 1
       or jsonb_array_length(p_items) > 100 then
        raise exception 'Order must contain between 1 and 100 items'
            using errcode = '22023';
    end if;

    perform pg_advisory_xact_lock(hashtext(p_idempotency_key::text));
    select o.id, o.idempotency_payload
      into v_order_id, v_existing_payload
      from public.sales_orders o
     where o.idempotency_key = p_idempotency_key
     for update;

    if found then
        v_expected_payload := jsonb_build_object(
            'store_id', p_store_id,
            'warehouse_id', p_warehouse_id,
            'customer_id', v_existing_payload -> 'customer_id',
            'items', (
                select jsonb_agg(
                    jsonb_build_object('variant_id', x.variant_id, 'quantity', x.quantity)
                    order by x.variant_id, x.quantity
                )
                  from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity bigint)
            ),
            'paid_amount', 0,
            'payment_method', 'cash'
        );
        if (v_existing_payload - 'storefront_customer_name'
                - 'storefront_customer_phone' - 'storefront_shipping_address')
                is distinct from v_expected_payload
           or v_existing_payload ->> 'storefront_customer_name' is distinct from v_customer_name
           or v_existing_payload ->> 'storefront_customer_phone' is distinct from v_customer_phone
           or v_existing_payload ->> 'storefront_shipping_address' is distinct from v_shipping_address then
            raise exception 'Idempotency key was reused with different order data'
                using errcode = '23505';
        end if;
        return v_order_id;
    end if;

    insert into public.customers (
        store_id, name, phone, shipping_address
    )
    values (
        p_store_id, v_customer_name, v_customer_phone, v_shipping_address
    )
    returning id into v_customer_id;

    v_order_id := public.create_and_reserve_order(
        p_store_id,
        p_warehouse_id,
        p_items,
        null,
        v_customer_id,
        0,
        'cash',
        p_idempotency_key
    );

    update public.sales_orders
       set idempotency_payload = idempotency_payload || jsonb_build_object(
           'storefront_customer_name', v_customer_name,
           'storefront_customer_phone', v_customer_phone,
           'storefront_shipping_address', v_shipping_address
       )
     where id = v_order_id;

    return v_order_id;
end;
$$;

revoke all on function public.create_storefront_order(
    uuid, uuid, jsonb, text, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.create_storefront_order(
    uuid, uuid, jsonb, text, text, text, uuid
) to service_role;

commit;

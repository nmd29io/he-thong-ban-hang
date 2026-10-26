begin;

select plan(27);

insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
    '90000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'mvp-test-owner@local.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
);

insert into public.stores (id, code, name)
values (
    '91000000-0000-0000-0000-000000000001',
    'MVP-TEST',
    'MVP test store'
);

insert into public.warehouses (id, store_id, code, name)
values (
    '92000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    'MVP-WH',
    'MVP test warehouse'
);

insert into public.store_memberships (store_id, user_id, role)
values (
    '91000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    'owner'
);

set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000001';

select lives_ok(
    $$select * from public.create_catalog_item(
        'Test item', 'MVP-TEST-SKU', 'Default', 1000, null
    )$$,
    'owner can create a product and SKU atomically'
);

select isnt(
    (select id from public.product_variants where sku = 'MVP-TEST-SKU'),
    null::uuid,
    'product creation produces a SKU'
);

select lives_ok(
    $$select public.add_product_variant(
        (select product_id from public.product_variants where sku = 'MVP-TEST-SKU'),
        'MVP-TEST-SKU-2', 'Large', 1200
    )$$,
    'manager can add a second variant to an existing product'
);

select is(
    (select unit_price from public.product_variants where sku = 'MVP-TEST-SKU-2'),
    1200::numeric,
    'new variant stores its own price'
);

create temporary table test_ids (
    inventory_entry_id uuid,
    order_id uuid,
    payment_id uuid,
    second_order_id uuid
);
insert into test_ids default values;

update test_ids
   set inventory_entry_id = public.record_inventory_movement(
       '91000000-0000-0000-0000-000000000001',
       '92000000-0000-0000-0000-000000000001',
       (select id from public.product_variants where sku = 'MVP-TEST-SKU'),
       10,
       'receipt',
       'Opening stock from test voucher',
       '90000000-0000-0000-0000-000000000001',
       '93000000-0000-0000-0000-000000000001'
   );

select is(
    (select on_hand from public.inventory_balances
      where warehouse_id = '92000000-0000-0000-0000-000000000001'
        and variant_id = (select id from public.product_variants where sku = 'MVP-TEST-SKU')),
    10::bigint,
    'inventory receipt updates the stock balance'
);

select is(
    (select metadata ->> 'note' from public.inventory_ledger
      where id = (select inventory_entry_id from test_ids)),
    'Opening stock from test voucher',
    'inventory ledger keeps the operator reason'
);

select is(
    public.record_inventory_movement(
        '91000000-0000-0000-0000-000000000001',
        '92000000-0000-0000-0000-000000000001',
        (select id from public.product_variants where sku = 'MVP-TEST-SKU'),
        10,
        'receipt',
        'Opening stock from test voucher',
        '90000000-0000-0000-0000-000000000001',
        '93000000-0000-0000-0000-000000000001'
    ),
    (select inventory_entry_id from test_ids),
    'replaying the same stock request returns its original entry'
);

select throws_ok(
    $$select public.record_inventory_movement(
        '91000000-0000-0000-0000-000000000001',
        '92000000-0000-0000-0000-000000000001',
        (select id from public.product_variants where sku = 'MVP-TEST-SKU'),
        11,
        'receipt',
        'Opening stock from test voucher',
        '90000000-0000-0000-0000-000000000001',
        '93000000-0000-0000-0000-000000000001'
    )$$,
    '23505',
    'Idempotency key was reused with different inventory data',
    'inventory idempotency rejects a key with different input'
);

update test_ids
   set order_id = public.create_and_reserve_order(
       '91000000-0000-0000-0000-000000000001',
       '92000000-0000-0000-0000-000000000001',
       jsonb_build_array(jsonb_build_object(
           'variant_id', (select id from public.product_variants where sku = 'MVP-TEST-SKU'),
           'quantity', 2
       )),
       '90000000-0000-0000-0000-000000000001',
       null,
       500,
       'cash',
       '94000000-0000-0000-0000-000000000001'
   );

select is(
    (select status from public.sales_orders where id = (select order_id from test_ids)),
    'confirmed',
    'creating an order reserves stock and confirms it'
);

select is(
    (select reserved from public.inventory_balances
      where warehouse_id = '92000000-0000-0000-0000-000000000001'
        and variant_id = (select id from public.product_variants where sku = 'MVP-TEST-SKU')),
    2::bigint,
    'order quantity is reflected in reserved stock'
);

select is(
    public.create_and_reserve_order(
        '91000000-0000-0000-0000-000000000001',
        '92000000-0000-0000-0000-000000000001',
        jsonb_build_array(jsonb_build_object(
            'variant_id', (select id from public.product_variants where sku = 'MVP-TEST-SKU'),
            'quantity', 2
        )),
        '90000000-0000-0000-0000-000000000001',
        null,
        500,
        'cash',
        '94000000-0000-0000-0000-000000000001'
    ),
    (select order_id from test_ids),
    'retrying an order with the same key returns the original order'
);

select is(
    (select count(*)::integer from public.sales_orders
      where idempotency_key = '94000000-0000-0000-0000-000000000001'),
    1,
    'idempotent order creation does not duplicate orders'
);

select throws_ok(
    $$select public.create_and_reserve_order(
        '91000000-0000-0000-0000-000000000001',
        '92000000-0000-0000-0000-000000000001',
        jsonb_build_array(jsonb_build_object(
            'variant_id', (select id from public.product_variants where sku = 'MVP-TEST-SKU'),
            'quantity', 3
        )),
        '90000000-0000-0000-0000-000000000001',
        null,
        500,
        'cash',
        '94000000-0000-0000-0000-000000000001'
    )$$,
    '23505',
    'Idempotency key was reused with different order data',
    'reusing an order key with a different payload is rejected'
);

select throws_ok(
    $$select public.create_and_reserve_order(
        '91000000-0000-0000-0000-000000000001',
        '92000000-0000-0000-0000-000000000001',
        jsonb_build_array(jsonb_build_object(
            'variant_id', (select id from public.product_variants where sku = 'MVP-TEST-SKU'),
            'quantity', 1
        )),
        '90000000-0000-0000-0000-000000000002',
        null,
        0,
        'cash',
        '94000000-0000-0000-0000-000000000002'
    )$$,
    '42501',
    'User is not allowed to create orders for this store',
    'an unassigned account cannot create orders'
);

update test_ids
   set payment_id = public.record_order_payment(
       '91000000-0000-0000-0000-000000000001',
       (select order_id from test_ids),
       500,
       'bank_transfer',
       '90000000-0000-0000-0000-000000000001',
       '95000000-0000-0000-0000-000000000001'
   );

select is(
    public.record_order_payment(
        '91000000-0000-0000-0000-000000000001',
        (select order_id from test_ids),
        500,
        'bank_transfer',
        '90000000-0000-0000-0000-000000000001',
        '95000000-0000-0000-0000-000000000001'
    ),
    (select payment_id from test_ids),
    'retrying a payment returns its original entry'
);

select throws_ok(
    $$select public.record_order_payment(
        '91000000-0000-0000-0000-000000000001',
        (select order_id from test_ids),
        600,
        'bank_transfer',
        '90000000-0000-0000-0000-000000000001',
        '95000000-0000-0000-0000-000000000001'
    )$$,
    '23505',
    'Idempotency key was reused with different payment data',
    'a payment key cannot be reused for another amount'
);

select is(
    (select sum(amount) from public.payments
      where order_id = (select order_id from test_ids)
        and status = 'succeeded'),
    1000::numeric,
    'partial and follow-up payments are both recorded once'
);

select is(
    public.complete_sales_order(
        '91000000-0000-0000-0000-000000000001',
        (select order_id from test_ids),
        '90000000-0000-0000-0000-000000000001'
    ),
    (select order_id from test_ids),
    'completing an order succeeds'
);

select is(
    (select on_hand from public.inventory_balances
      where warehouse_id = '92000000-0000-0000-0000-000000000001'
        and variant_id = (select id from public.product_variants where sku = 'MVP-TEST-SKU')),
    8::bigint,
    'completion consumes physical stock'
);

select is(
    (select reserved from public.inventory_balances
      where warehouse_id = '92000000-0000-0000-0000-000000000001'
        and variant_id = (select id from public.product_variants where sku = 'MVP-TEST-SKU')),
    0::bigint,
    'completion releases the stock reservation'
);

select is(
    (select count(*)::integer from public.inventory_ledger
      where reference_type = 'sales_order'
        and reference_id = (select order_id from test_ids)
        and event_type = 'sale'),
    1,
    'completion writes one sale ledger entry'
);

update test_ids
   set second_order_id = public.create_and_reserve_order(
       '91000000-0000-0000-0000-000000000001',
       '92000000-0000-0000-0000-000000000001',
       jsonb_build_array(jsonb_build_object(
           'variant_id', (select id from public.product_variants where sku = 'MVP-TEST-SKU'),
           'quantity', 1
       )),
       '90000000-0000-0000-0000-000000000001',
       null,
       0,
       'cash',
       '94000000-0000-0000-0000-000000000003'
   );

select is(
    public.cancel_sales_order(
        '91000000-0000-0000-0000-000000000001',
        (select second_order_id from test_ids),
        '90000000-0000-0000-0000-000000000001'
    ),
    (select second_order_id from test_ids),
    'cancelling a confirmed order succeeds'
);

select is(
    (select reserved from public.inventory_balances
      where warehouse_id = '92000000-0000-0000-0000-000000000001'
        and variant_id = (select id from public.product_variants where sku = 'MVP-TEST-SKU')),
    0::bigint,
    'cancellation releases reserved stock'
);

select is(
    (select status from public.sales_orders where id = (select second_order_id from test_ids)),
    'cancelled',
    'cancelled order status is persisted'
);

select is(
    (select sales_total from public.get_store_report(
        '91000000-0000-0000-0000-000000000001',
        now() - interval '1 day',
        now() + interval '1 day'
    )),
    2000::numeric,
    'report excludes cancelled sales'
);

select is(
    (select paid_total from public.get_store_report(
        '91000000-0000-0000-0000-000000000001',
        now() - interval '1 day',
        now() + interval '1 day'
    )),
    1000::numeric,
    'report totals succeeded payments for included orders'
);

select is(
    (select unpaid_total from public.get_store_report(
        '91000000-0000-0000-0000-000000000001',
        now() - interval '1 day',
        now() + interval '1 day'
    )),
    1000::numeric,
    'report calculates the remaining balance'
);

select * from finish();
rollback;

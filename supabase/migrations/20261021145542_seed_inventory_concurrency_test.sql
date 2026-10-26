
begin;

-- 1. Store
insert into public.stores (id, code, name)
values (
    '10000000-0000-0000-0000-000000000001',
    'STORE-TEST',
    'Cửa hàng kiểm thử'
);

-- 2. Warehouse
insert into public.warehouses (id, store_id, code, name)
values (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'WH-TEST',
    'Kho kiểm thử'
);

-- 3. Product and SKU
insert into public.products (id, name)
values (
    '30000000-0000-0000-0000-000000000001',
    'Sản phẩm kiểm thử tồn kho'
);

insert into public.product_variants (id, product_id, sku, variant_name)
values (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'SKU-TEST-001',
    'Phiên bản tiêu chuẩn'
);

-- 4. Exactly one physical unit available
insert into public.inventory_balances (
    warehouse_id, variant_id, on_hand, reserved
)
values (
    '20000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    1,
    0
);

-- 5. Two draft orders competing for the same unit
insert into public.sales_orders (
    id, order_number, store_id, warehouse_id,
    status, currency, subtotal, total_amount
)
values
(
    '50000000-0000-0000-0000-000000000001',
    'TEST-CONCURRENCY-001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'draft', 'VND', 100000, 100000
),
(
    '50000000-0000-0000-0000-000000000002',
    'TEST-CONCURRENCY-002',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'draft', 'VND', 100000, 100000
);

-- 6. Each order requests one unit of the same SKU
insert into public.sales_order_items (
    id, order_id, variant_id, quantity, unit_price
)
values
(
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    1, 100000
),
(
    '60000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    1, 100000
);

commit;

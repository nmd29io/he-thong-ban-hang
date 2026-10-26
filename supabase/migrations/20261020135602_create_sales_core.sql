
begin;

create extension if not exists pgcrypto;

-- 1. Stores and warehouses
create table public.stores (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    name text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    constraint stores_code_not_blank check (length(trim(code)) > 0),
    constraint stores_name_not_blank check (length(trim(name)) > 0)
);

create table public.warehouses (
    id uuid primary key default gen_random_uuid(),
    store_id uuid not null references public.stores(id),
    code text not null,
    name text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    unique (store_id, code),
    unique (id, store_id),
    constraint warehouses_code_not_blank check (length(trim(code)) > 0)
);

-- 2. Products and SKU variants
create table public.products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    constraint products_name_not_blank check (length(trim(name)) > 0)
);

create table public.product_variants (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id),
    sku text not null unique,
    variant_name text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    constraint variants_sku_not_blank check (length(trim(sku)) > 0)
);

-- 3. Inventory balance.
-- on_hand = physical stock; reserved = stock held for orders.
-- Available stock = on_hand - reserved.
create table public.inventory_balances (
    warehouse_id uuid not null references public.warehouses(id),
    variant_id uuid not null references public.product_variants(id),
    on_hand bigint not null default 0,
    reserved bigint not null default 0,
    updated_at timestamptz not null default now(),
    primary key (warehouse_id, variant_id),
    constraint inventory_nonnegative check (on_hand >= 0 and reserved >= 0),
    constraint inventory_reserved_not_over_on_hand check (reserved <= on_hand)
);

-- 4. Orders and order lines
create table public.sales_orders (
    id uuid primary key default gen_random_uuid(),
    order_number text not null unique,
    store_id uuid not null,
    warehouse_id uuid not null,
    status text not null default 'draft'
        check (status in (
            'draft', 'confirmed', 'cancelled', 'fulfilled'
        )),
    currency char(3) not null default 'VND',
    subtotal numeric(18,2) not null default 0,
    discount_amount numeric(18,2) not null default 0,
    tax_amount numeric(18,2) not null default 0,
    total_amount numeric(18,2) not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    foreign key (warehouse_id, store_id)
        references public.warehouses(id, store_id),
    unique (id, warehouse_id),
    constraint order_amounts_nonnegative check (
        subtotal >= 0 and discount_amount >= 0
        and tax_amount >= 0 and total_amount >= 0
    ),
    constraint order_currency_uppercase check (currency = upper(currency))
);

create table public.sales_order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.sales_orders(id),
    variant_id uuid not null references public.product_variants(id),
    quantity bigint not null check (quantity > 0),
    unit_price numeric(18,2) not null check (unit_price >= 0),
    line_total numeric(18,2)
        generated always as (quantity * unit_price) stored,
    created_at timestamptz not null default now(),
    unique (id, order_id)
);

create index sales_order_items_order_idx
    on public.sales_order_items(order_id);

-- 5. Reservations: at most one reservation record per order line.
-- A reservation must reference a line belonging to the same order.
create table public.inventory_reservations (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null,
    order_item_id uuid not null unique,
    warehouse_id uuid not null,
    variant_id uuid not null,
    quantity bigint not null check (quantity > 0),
    status text not null default 'active'
        check (status in ('active', 'released', 'consumed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    foreign key (order_id, warehouse_id)
        references public.sales_orders(id, warehouse_id),
    foreign key (order_item_id, order_id)
        references public.sales_order_items(id, order_id),
    foreign key (warehouse_id, variant_id)
        references public.inventory_balances(warehouse_id, variant_id)
);

create index reservations_order_status_idx
    on public.inventory_reservations(order_id, status);

-- Validate reservation quantity and SKU against the order line.
create or replace function public.check_reservation_matches_order_item()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    v_item public.sales_order_items%rowtype;
    v_order public.sales_orders%rowtype;
begin
    select * into v_item
    from public.sales_order_items
    where id = new.order_item_id
      and order_id = new.order_id;

    if not found then
        raise exception 'Reservation order line does not exist';
    end if;

    select * into v_order
    from public.sales_orders
    where id = new.order_id;

    if not found then
        raise exception 'Reservation order does not exist';
    end if;

    if new.quantity <> v_item.quantity then
        raise exception 'Reservation quantity must equal order line quantity';
    end if;

    if new.variant_id <> v_item.variant_id then
        raise exception 'Reservation variant must match order line variant';
    end if;

    if new.warehouse_id <> v_order.warehouse_id then
        raise exception 'Reservation warehouse must match order warehouse';
    end if;

    return new;
end;
$$;

create trigger reservation_matches_order_item
before insert or update on public.inventory_reservations
for each row execute function public.check_reservation_matches_order_item();

-- 6. Append-only inventory ledger.
create table public.inventory_ledger (
    id uuid primary key default gen_random_uuid(),
    warehouse_id uuid not null references public.warehouses(id),
    variant_id uuid not null references public.product_variants(id),
    event_type text not null check (event_type in (
        'opening_balance', 'receipt', 'sale', 'return',
        'adjustment', 'transfer_in', 'transfer_out'
    )),
    quantity_delta bigint not null check (quantity_delta <> 0),
    reference_type text,
    reference_id uuid,
    idempotency_key text unique,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    foreign key (warehouse_id, variant_id)
        references public.inventory_balances(warehouse_id, variant_id)
);

create index inventory_ledger_lookup_idx
    on public.inventory_ledger(warehouse_id, variant_id, created_at desc);

create or replace function public.reject_inventory_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    raise exception 'Inventory ledger is append-only; UPDATE and DELETE are forbidden';
end;
$$;

create trigger inventory_ledger_no_update_delete
before update or delete on public.inventory_ledger
for each row execute function public.reject_inventory_ledger_mutation();

-- 7. Multiple payments per order.
create table public.payments (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.sales_orders(id),
    provider text not null,
    provider_payment_id text,
    amount numeric(18,2) not null check (amount > 0),
    currency char(3) not null default 'VND',
    status text not null default 'pending'
        check (status in (
            'pending', 'authorized', 'succeeded', 'failed', 'refunded'
        )),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index payments_order_idx on public.payments(order_id);

create unique index payments_provider_payment_unique
    on public.payments(provider, provider_payment_id)
    where provider_payment_id is not null;

-- Store webhook deliveries separately for idempotent processing.
create table public.payment_webhook_events (
    id uuid primary key default gen_random_uuid(),
    provider text not null,
    provider_event_id text not null,
    event_type text not null,
    payload jsonb not null default '{}'::jsonb,
    processing_status text not null default 'pending'
        check (processing_status in ('pending', 'processing', 'processed', 'failed')),
    received_at timestamptz not null default now(),
    processed_at timestamptz,
    unique (provider, provider_event_id)
);

-- Enable RLS. No client-facing policies are created yet.
-- Access will be added deliberately after the authorization model is defined.
alter table public.stores enable row level security;
alter table public.warehouses enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.inventory_ledger enable row level security;
alter table public.payments enable row level security;
alter table public.payment_webhook_events enable row level security;

commit;

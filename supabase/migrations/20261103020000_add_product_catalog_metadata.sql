begin;

alter table public.products
    add column if not exists category text,
    add column if not exists brand text;

alter table public.product_variants
    add column if not exists unit text not null default 'Cái';

commit;

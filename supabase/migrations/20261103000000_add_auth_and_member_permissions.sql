begin;

alter table public.store_memberships
    add column if not exists permissions text[] not null default '{}';

create or replace function public.role_permission_preset(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
    select case p_role
        when 'owner' then array[
            'sales.create', 'orders.read', 'orders.manage',
            'payments.read', 'payments.manage',
            'customers.read', 'customers.manage',
            'products.read', 'products.manage',
            'inventory.read', 'inventory.manage',
            'reports.read', 'members.manage'
        ]::text[]
        when 'manager' then array[
            'sales.create', 'orders.read', 'orders.manage',
            'payments.read', 'payments.manage',
            'customers.read', 'customers.manage',
            'products.read', 'products.manage',
            'inventory.read', 'inventory.manage', 'reports.read'
        ]::text[]
        when 'cashier' then array[
            'sales.create', 'orders.read', 'orders.manage',
            'payments.read', 'payments.manage',
            'customers.read', 'customers.manage', 'products.read'
        ]::text[]
        when 'stock_clerk' then array[
            'products.read', 'inventory.read', 'inventory.manage'
        ]::text[]
        when 'accountant' then array[
            'orders.read', 'payments.read', 'payments.manage',
            'customers.read', 'products.read', 'inventory.read', 'reports.read'
        ]::text[]
        else array[]::text[]
    end;
$$;

update public.store_memberships
   set permissions = public.role_permission_preset(role)
 where cardinality(permissions) = 0;

create or replace function public.user_has_store_permission(
    p_store_id uuid,
    p_permission text
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
           and (
               m.role = 'owner'
               or (
                   p_permission <> 'members.manage'
                   and p_permission = any(m.permissions)
               )
           )
    );
$$;

create or replace function public.user_has_store_permission(
    p_store_id uuid,
    p_permission text,
    p_user_id uuid
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
           and m.user_id = p_user_id
           and m.is_active
           and (
               m.role = 'owner'
               or (
                   p_permission <> 'members.manage'
                   and p_permission = any(m.permissions)
               )
           )
    );
$$;

create or replace function public.user_has_any_store_permission(
    p_permission text
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
         where m.user_id = (select auth.uid())
           and m.is_active
           and (
               m.role = 'owner'
               or (
                   p_permission <> 'members.manage'
                   and p_permission = any(m.permissions)
               )
           )
    );
$$;

revoke all on function public.user_has_store_permission(uuid, text)
    from public, anon;
revoke all on function public.user_has_store_permission(uuid, text, uuid)
    from public, anon, authenticated;
revoke all on function public.user_has_any_store_permission(text)
    from public, anon;
grant execute on function public.user_has_store_permission(uuid, text)
    to authenticated, service_role;
grant execute on function public.user_has_store_permission(uuid, text, uuid)
    to service_role;
grant execute on function public.user_has_any_store_permission(text)
    to authenticated, service_role;

drop function public.set_store_membership(uuid, uuid, text, boolean);

create function public.set_store_membership(
    p_actor_id uuid,
    p_store_id uuid,
    p_user_id uuid,
    p_role text,
    p_permissions text[],
    p_is_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_permissions text[];
    v_existing_role text;
begin
    if not public.user_has_store_permission(
        p_store_id, 'members.manage', p_actor_id
    ) then
        raise exception 'Only store owners can manage memberships'
            using errcode = '42501';
    end if;
    if p_role is null or p_role not in (
        'owner', 'manager', 'cashier', 'stock_clerk', 'accountant'
    ) then
        raise exception 'Unsupported store role'
            using errcode = '22023';
    end if;
    if p_user_id is null or not exists (
        select 1 from auth.users u where u.id = p_user_id
    ) then
        raise exception 'User account does not exist'
            using errcode = '23503';
    end if;

    v_permissions := coalesce(p_permissions, public.role_permission_preset(p_role));
    if exists (
        select 1
          from unnest(v_permissions) as granted(permission)
         where granted.permission is null or granted.permission not in (
             'sales.create', 'orders.read', 'orders.manage',
             'payments.read', 'payments.manage',
             'customers.read', 'customers.manage',
             'products.read', 'products.manage',
             'inventory.read', 'inventory.manage',
             'reports.read', 'members.manage'
         )
    ) then
        raise exception 'Unsupported member permission'
            using errcode = '22023';
    end if;
    select array_agg(distinct granted.permission order by granted.permission)
      into v_permissions
      from unnest(v_permissions) as granted(permission);
    v_permissions := coalesce(v_permissions, array[]::text[]);
    if p_role <> 'owner' and 'members.manage' = any(v_permissions) then
        raise exception 'Only store owners can manage memberships'
            using errcode = '42501';
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

    insert into public.store_memberships (
        store_id, user_id, role, permissions, is_active
    )
    values (p_store_id, p_user_id, p_role, v_permissions, p_is_active)
    on conflict (store_id, user_id) do update
       set role = excluded.role,
           permissions = excluded.permissions,
           is_active = excluded.is_active;
end;
$$;

revoke all on function public.set_store_membership(
    uuid, uuid, uuid, text, text[], boolean
) from public, anon, authenticated;
grant execute on function public.set_store_membership(
    uuid, uuid, uuid, text, text[], boolean
) to service_role;

drop policy if exists "members can read their store memberships" on public.store_memberships;
create policy "members can read their store memberships"
    on public.store_memberships for select to authenticated
    using (
        user_id = (select auth.uid())
        or public.user_has_store_permission(store_id, 'members.manage')
    );

drop policy if exists "members can read their stores" on public.stores;
create policy "members can read their stores"
    on public.stores for select to authenticated
    using (public.user_has_store_role(id));

drop policy if exists "members can read their warehouses" on public.warehouses;
create policy "members can read their warehouses"
    on public.warehouses for select to authenticated
    using (public.user_has_store_role(store_id));

drop policy if exists "members can read products" on public.products;
create policy "members can read products"
    on public.products for select to authenticated
    using (
        public.user_has_any_store_permission('products.read')
        or public.user_has_any_store_permission('sales.create')
        or public.user_has_any_store_permission('inventory.read')
        or public.user_has_any_store_permission('inventory.manage')
    );

drop policy if exists "managers can manage products" on public.products;
create policy "managers can manage products"
    on public.products for all to authenticated
    using (public.user_has_any_store_permission('products.manage'))
    with check (public.user_has_any_store_permission('products.manage'));

drop policy if exists "members can read product variants" on public.product_variants;
create policy "members can read product variants"
    on public.product_variants for select to authenticated
    using (
        public.user_has_any_store_permission('products.read')
        or public.user_has_any_store_permission('sales.create')
        or public.user_has_any_store_permission('inventory.read')
        or public.user_has_any_store_permission('inventory.manage')
    );

drop policy if exists "managers can manage product variants" on public.product_variants;
create policy "managers can manage product variants"
    on public.product_variants for all to authenticated
    using (public.user_has_any_store_permission('products.manage'))
    with check (public.user_has_any_store_permission('products.manage'));

drop policy if exists "members can read inventory balances" on public.inventory_balances;
create policy "members can read inventory balances"
    on public.inventory_balances for select to authenticated
    using (
        exists (
            select 1
              from public.warehouses w
             where w.id = warehouse_id
               and (
                   public.user_has_store_permission(w.store_id, 'inventory.read')
                   or public.user_has_store_permission(w.store_id, 'inventory.manage')
                   or public.user_has_store_permission(w.store_id, 'sales.create')
               )
        )
    );

drop policy if exists "members can read sales orders" on public.sales_orders;
create policy "members can read sales orders"
    on public.sales_orders for select to authenticated
    using (
        public.user_has_store_permission(store_id, 'orders.read')
        or public.user_has_store_permission(store_id, 'orders.manage')
        or public.user_has_store_permission(store_id, 'payments.read')
        or public.user_has_store_permission(store_id, 'payments.manage')
        or public.user_has_store_permission(store_id, 'sales.create')
    );

drop policy if exists "members can read order items" on public.sales_order_items;
create policy "members can read order items"
    on public.sales_order_items for select to authenticated
    using (
        exists (
            select 1
              from public.sales_orders o
             where o.id = order_id
               and (
                   public.user_has_store_permission(o.store_id, 'orders.read')
                   or public.user_has_store_permission(o.store_id, 'orders.manage')
                   or public.user_has_store_permission(o.store_id, 'payments.read')
                   or public.user_has_store_permission(o.store_id, 'payments.manage')
                   or public.user_has_store_permission(o.store_id, 'sales.create')
               )
        )
    );

drop policy if exists "members can read reservations" on public.inventory_reservations;
create policy "members can read reservations"
    on public.inventory_reservations for select to authenticated
    using (
        exists (
            select 1
              from public.sales_orders o
             where o.id = order_id
               and (
                   public.user_has_store_permission(o.store_id, 'orders.read')
                   or public.user_has_store_permission(o.store_id, 'orders.manage')
                   or public.user_has_store_permission(o.store_id, 'inventory.read')
               )
        )
    );

drop policy if exists "members can read inventory ledger" on public.inventory_ledger;
create policy "members can read inventory ledger"
    on public.inventory_ledger for select to authenticated
    using (
        exists (
            select 1
              from public.warehouses w
             where w.id = warehouse_id
               and (
                   public.user_has_store_permission(w.store_id, 'inventory.read')
                   or public.user_has_store_permission(w.store_id, 'reports.read')
                   or public.user_has_store_permission(w.store_id, 'inventory.manage')
               )
        )
    );

drop policy if exists "members can read payments" on public.payments;
create policy "members can read payments"
    on public.payments for select to authenticated
    using (
        exists (
            select 1
              from public.sales_orders o
             where o.id = order_id
               and (
                   public.user_has_store_permission(o.store_id, 'payments.read')
                   or public.user_has_store_permission(o.store_id, 'payments.manage')
               )
        )
    );

drop policy if exists "members can read customers" on public.customers;
create policy "members can read customers"
    on public.customers for select to authenticated
    using (
        public.user_has_store_permission(store_id, 'customers.read')
        or public.user_has_store_permission(store_id, 'customers.manage')
        or public.user_has_store_permission(store_id, 'sales.create')
    );

drop policy if exists "sales staff can add customers" on public.customers;
create policy "sales staff can add customers"
    on public.customers for insert to authenticated
    with check (public.user_has_store_permission(store_id, 'customers.manage'));

drop policy if exists "sales staff can update customers" on public.customers;
create policy "sales staff can update customers"
    on public.customers for update to authenticated
    using (public.user_has_store_permission(store_id, 'customers.manage'))
    with check (public.user_has_store_permission(store_id, 'customers.manage'));

drop policy if exists "managers can delete customers" on public.customers;
create policy "managers can delete customers"
    on public.customers for delete to authenticated
    using (public.user_has_store_permission(store_id, 'customers.manage'));

drop policy if exists "managers can upload product images" on storage.objects;
create policy "managers can upload product images"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'product-images'
        and public.user_has_any_store_permission('products.manage')
    );

drop policy if exists "managers can update product images" on storage.objects;
create policy "managers can update product images"
    on storage.objects for update to authenticated
    using (
        bucket_id = 'product-images'
        and public.user_has_any_store_permission('products.manage')
    )
    with check (
        bucket_id = 'product-images'
        and public.user_has_any_store_permission('products.manage')
    );

drop policy if exists "managers can delete product images" on storage.objects;
create policy "managers can delete product images"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'product-images'
        and public.user_has_any_store_permission('products.manage')
    );

do $$
declare
    v_definition text;
    v_updated_definition text;
    v_function regprocedure;
    v_old text;
    v_new text;
    v_item record;
begin
    for v_item in
        select *
          from (values
            (
                'public.create_and_reserve_order(uuid,uuid,jsonb,uuid,uuid,numeric,text,uuid)'::regprocedure,
                'and m.role in (''owner'', ''manager'', ''cashier'')',
                'and public.user_has_store_permission(p_store_id, ''sales.create'', p_actor_id)'
            ),
            (
                'public.record_inventory_movement(uuid,uuid,uuid,bigint,text,text,uuid,uuid)'::regprocedure,
                'and m.is_active and m.role in (''owner'', ''manager'', ''stock_clerk'')',
                'and m.is_active and public.user_has_store_permission(p_store_id, ''inventory.manage'', p_actor_id)'
            ),
            (
                'public.record_order_payment(uuid,uuid,numeric,text,uuid,uuid)'::regprocedure,
                'and m.is_active and m.role in (''owner'', ''manager'', ''cashier'', ''accountant'')',
                'and m.is_active and public.user_has_store_permission(p_store_id, ''payments.manage'', p_actor_id)'
            ),
            (
                'public.complete_sales_order(uuid,uuid,uuid)'::regprocedure,
                'and m.is_active and m.role in (''owner'', ''manager'', ''cashier'')',
                'and m.is_active and public.user_has_store_permission(p_store_id, ''orders.manage'', p_actor_id)'
            ),
            (
                'public.cancel_sales_order(uuid,uuid,uuid)'::regprocedure,
                'and m.is_active and m.role in (''owner'', ''manager'', ''cashier'')',
                'and m.is_active and public.user_has_store_permission(p_store_id, ''orders.manage'', p_actor_id)'
            )
          ) as functions(function_oid, old_check, new_check)
    loop
        v_definition := pg_get_functiondef(v_item.function_oid);
        v_updated_definition := replace(v_definition, v_item.old_check, v_item.new_check);
        if v_updated_definition = v_definition then
            raise exception 'Permission check was not found in function %', v_item.function_oid;
        end if;
        execute v_updated_definition;
    end loop;

    v_function := 'public.create_catalog_item(text,text,text,numeric,text)'::regprocedure;
    v_definition := pg_get_functiondef(v_function);
    v_updated_definition := regexp_replace(
        v_definition,
        'public\.user_has_any_store_role\s*\(\s*(?:array|ARRAY)\s*\[\s*''owner''(?:::\w+)?\s*,\s*''manager''(?:::\w+)?\s*\]\s*\)',
        'public.user_has_any_store_permission(''products.manage'')'
    );
    if v_updated_definition = v_definition then
        raise exception 'Catalog permission check was not found in create_catalog_item';
    end if;
    execute v_updated_definition;

    v_function := 'public.add_product_variant(uuid,text,text,numeric)'::regprocedure;
    v_definition := pg_get_functiondef(v_function);
    v_updated_definition := regexp_replace(
        v_definition,
        'public\.user_has_any_store_role\s*\(\s*(?:array|ARRAY)\s*\[\s*''owner''(?:::\w+)?\s*,\s*''manager''(?:::\w+)?\s*\]\s*\)',
        'public.user_has_any_store_permission(''products.manage'')'
    );
    if v_updated_definition = v_definition then
        raise exception 'Catalog permission check was not found in add_product_variant';
    end if;
    execute v_updated_definition;

    v_function := 'public.get_store_report(uuid,timestamp with time zone,timestamp with time zone)'::regprocedure;
    v_definition := pg_get_functiondef(v_function);
    v_updated_definition := regexp_replace(
        v_definition,
        'public\.user_has_store_role\s*\(\s*p_store_id\s*,\s*array\s*\[\s*''owner''\s*,\s*''manager''\s*,\s*''accountant''\s*\]\s*\)',
        'public.user_has_store_permission(p_store_id, ''reports.read'')'
    );
    if v_updated_definition = v_definition then
        raise exception 'Report permission check was not found in get_store_report';
    end if;
    execute v_updated_definition;

    v_function := 'public.get_store_recommendations(uuid,integer)'::regprocedure;
    v_definition := pg_get_functiondef(v_function);
    v_updated_definition := replace(
        v_definition,
        'if not public.user_has_store_role(p_store_id) then',
        'if not (public.user_has_store_permission(p_store_id, ''sales.create'') or public.user_has_store_permission(p_store_id, ''reports.read'')) then'
    );
    if v_updated_definition = v_definition then
        raise exception 'Recommendation permission check was not found';
    end if;
    execute v_updated_definition;
end;
$$;

revoke all on function public.user_has_store_role(uuid, text[]) from public;
revoke all on function public.user_has_any_store_role(text[]) from public;
grant execute on function public.user_has_store_role(uuid, text[])
    to authenticated, service_role;
grant execute on function public.user_has_any_store_role(text[])
    to authenticated, service_role;

commit;

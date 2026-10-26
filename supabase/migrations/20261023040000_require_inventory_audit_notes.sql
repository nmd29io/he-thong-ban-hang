begin;

drop function public.record_inventory_movement(
    uuid, uuid, uuid, bigint, text, uuid, uuid
);

create function public.record_inventory_movement(
    p_store_id uuid,
    p_warehouse_id uuid,
    p_variant_id uuid,
    p_quantity_delta bigint,
    p_event_type text,
    p_note text,
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
    if p_note is null or length(trim(p_note)) = 0 or length(trim(p_note)) > 500 then
        raise exception 'Inventory movement reason must contain 1 to 500 characters'
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
           or v_existing.event_type <> p_event_type
           or v_existing.metadata ->> 'note' is distinct from trim(p_note) then
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
        jsonb_build_object(
            'store_id', p_store_id,
            'actor_id', p_actor_id,
            'note', trim(p_note)
        )
    )
    returning id into v_ledger_id;

    return v_ledger_id;
end;
$$;

revoke all on function public.record_inventory_movement(
    uuid, uuid, uuid, bigint, text, text, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.record_inventory_movement(
    uuid, uuid, uuid, bigint, text, text, uuid, uuid
) to service_role;

commit;

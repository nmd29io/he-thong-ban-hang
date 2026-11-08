begin;

do $$
declare
    v_function_oid oid;
    v_function_oids oid[] := array[
        'public.create_and_reserve_order(uuid,uuid,jsonb,uuid,uuid,numeric,text,uuid)'::regprocedure::oid,
        'public.create_storefront_order(uuid,uuid,jsonb,text,text,text,uuid)'::regprocedure::oid
    ];
    v_definition text;
    v_legacy_role_setting text := 'current_setting(''request.jwt.claim.role'', true)';
    v_role_setting text := 'coalesce(nullif(current_setting(''request.jwt.claim.role'', true), ''''), nullif(current_setting(''role'', true), ''''))';
begin
    foreach v_function_oid in array v_function_oids loop
        v_definition := pg_get_functiondef(v_function_oid);
        if position(v_legacy_role_setting in v_definition) = 0 then
            raise exception 'Expected service-role check not found in function %',
                v_function_oid::regprocedure;
        end if;

        execute replace(v_definition, v_legacy_role_setting, v_role_setting);
    end loop;
end;
$$;

commit;

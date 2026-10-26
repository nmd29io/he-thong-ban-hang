select
    defaclrole::regrole as owner_role,
    defaclnamespace::regnamespace as schema_name,
    defaclobjtype as object_type,
    defaclacl as default_privileges
from pg_default_acl
where defaclnamespace = 'public'::regnamespace
   or defaclnamespace = 0
order by 1, 2, 3;
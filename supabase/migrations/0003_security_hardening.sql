-- Fixes from the Supabase security advisor after the initial deploy:
--   1. Pin search_path on set_updated_at (function_search_path_mutable).
--   2. Stop handle_new_user (SECURITY DEFINER) from being callable
--      directly via the PostgREST RPC surface — it should only ever run
--      as the auth.users insert trigger.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated, public;

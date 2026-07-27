create or replace function public.debug_list_policies(p_table text)
returns table(policyname text, cmd text, qual text, with_check text)
language sql
security definer
set search_path = public
as $$
  select polname, case polcmd when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE' when 'd' then 'DELETE' else '*' end,
    pg_get_expr(polqual, polrelid), pg_get_expr(polwithcheck, polrelid)
  from pg_policy
  where polrelid = p_table::regclass;
$$;

grant execute on function public.debug_list_policies(text) to authenticated;

-- Endurecimiento sugerido por los advisors de Supabase.

-- 1) search_path fijo en funciones
alter function public.ayni_internal() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.profiles_protect() set search_path = public;
alter function public.listings_protect() set search_path = public;
alter function public.emergency_reports_protect() set search_path = public;

-- 2) funciones de trigger: nadie las llama por /rpc (los triggers no necesitan EXECUTE del usuario)
revoke execute on function public.favor_responses_aynis() from public, anon, authenticated;
revoke execute on function public.vistos_buenos_after() from public, anon, authenticated;
revoke execute on function public.vistos_buenos_validate() from public, anon, authenticated;
revoke execute on function public.profiles_protect() from public, anon, authenticated;
revoke execute on function public.listings_protect() from public, anon, authenticated;
revoke execute on function public.emergency_reports_protect() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- 3) helpers de RLS: solo usuarios autenticados (las políticas los evalúan con ese rol)
revoke execute on function public.my_zone_id() from public, anon;
revoke execute on function public.is_zone_admin(uuid) from public, anon;
grant execute on function public.my_zone_id() to authenticated;
grant execute on function public.is_zone_admin(uuid) to authenticated;

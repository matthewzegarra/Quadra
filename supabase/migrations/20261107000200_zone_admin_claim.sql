-- Reclamar el rol de junta vecinal con un PIN (para la demo y para juntas reales en fase 2).
-- La tabla de códigos no es legible por los clientes (RLS sin políticas).

create table if not exists public.zone_admin_codes (
  zone_id uuid primary key references public.zones(id) on delete cascade,
  code text not null
);
alter table public.zone_admin_codes enable row level security;

create or replace function public.claim_zone_admin(p_zone uuid, p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if auth.uid() is null then return false; end if;
  select exists (select 1 from public.zone_admin_codes where zone_id = p_zone and code = p_code) into ok;
  if not ok then return false; end if;
  perform set_config('ayni.internal', '1', true);
  update public.profiles set is_zone_admin = true, zone_id = p_zone where id = auth.uid();
  perform set_config('ayni.internal', '', true);
  return found;
end $$;

revoke execute on function public.claim_zone_admin(uuid, text) from public, anon;
grant execute on function public.claim_zone_admin(uuid, text) to authenticated;

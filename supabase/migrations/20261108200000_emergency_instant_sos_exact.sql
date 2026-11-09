-- Modo Emergencia: los avisos salen al instante y la junta revisa después (puede ocultar los falsos).
-- El SOS conserva su punto exacto: quien pide rescate necesita que lo encuentren.
-- Servicios, favores y recursos del día a día siguen con revisión previa y con la zona de ~250 m.

-- 1) Sin revisión previa para emergencia: la junta oculta después con review_status = 'rechazado'
--    (lo permite emergency_reports_protect, solo a la junta). Lo que llega por la red vecinal
--    (sin cuenta verificada) puede seguir subiendo como 'pendiente'.
alter table public.emergency_reports alter column review_status set default 'aprobado';
drop trigger if exists emergency_reports_review on public.emergency_reports;

-- 2) El SOS no se redondea a la zona pública; el resto sí.
create or replace function public.snap_public_point()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ent text := case tg_table_name
    when 'listings' then 'listing'
    when 'favors' then 'favor'
    when 'favor_responses' then 'favor_response'
    else 'emergency_report' end;
  exact_lat double precision := new.lat;
  exact_lng double precision := new.lng;
  phone text := case when tg_table_name = 'listings' then new.whatsapp else null end;
  -- to_jsonb: así no falla en tablas sin columna "kind"
  is_sos boolean := tg_table_name = 'emergency_reports' and (to_jsonb(new) ->> 'kind') = 'sos';
begin
  if is_sos then
    new.public_lat := exact_lat;
    new.public_lng := exact_lng;
    if auth.uid() is not null and auth.role() <> 'service_role' then
      perform public.stash_exact(ent, new.id, exact_lat, exact_lng, null);
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.lat is not distinct from old.lat and new.lng is not distinct from old.lng then
    if new.public_lat is null then
      new.public_lat := public.public_lat(exact_lat);
      new.public_lng := public.public_lng(exact_lat, exact_lng);
    end if;
    return new;
  end if;
  new.public_lat := public.public_lat(exact_lat);
  new.public_lng := public.public_lng(exact_lat, exact_lng);
  if auth.uid() is not null and auth.role() <> 'service_role' then
    perform public.stash_exact(ent, new.id, exact_lat, exact_lng, phone);
    new.lat := new.public_lat;
    new.lng := new.public_lng;
    if tg_table_name = 'listings' then
      new.whatsapp := null;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.snap_public_point() from public, anon, authenticated;

-- Corrige snap_public_point(): leía new.whatsapp en la declaración, y esa columna solo existe en
-- listings. En favors, favor_responses y emergency_reports el INSERT fallaba con
-- 'record "new" has no field "whatsapp"', así que ningún favor, oferta ni SOS subía al servidor.
-- Ahora los campos opcionales se leen con to_jsonb(new), que no falla si la columna no existe.

create or replace function public.snap_public_point()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ent text := case tg_table_name
    when 'listings' then 'listing'
    when 'favors' then 'favor'
    when 'favor_responses' then 'favor_response'
    else 'emergency_report' end;
  row_json jsonb := to_jsonb(new);
  exact_lat double precision := new.lat;
  exact_lng double precision := new.lng;
  phone text := case when tg_table_name = 'listings' then row_json ->> 'whatsapp' else null end;
  is_sos boolean := tg_table_name = 'emergency_reports' and (row_json ->> 'kind') = 'sos';
begin
  -- El SOS conserva su punto exacto: quien pide rescate necesita que lo encuentren.
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

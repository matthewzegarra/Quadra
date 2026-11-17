-- Endurecimiento de seguridad para la final (17/11). Revisión con los advisors de Supabase y OWASP.
-- Nada de esto cambia el flujo normal de la app; cierra abusos que la API permitía.

-- 1) search_path fijo (advisor 0011: function_search_path_mutable)
alter function public.public_lat(double precision) set search_path = public;
alter function public.public_lng(double precision, double precision) set search_path = public;

-- 2) Reportes de emergencia
--    a) Suplantación: la política deja subir reportes de OTRO autor si origin = 'mesh'/'sms' (para que
--       quien tenga internet suba lo que llegó por Bluetooth). Cualquiera podía usar eso para publicar
--       un SOS "aprobado" a nombre de un vecino. Ahora esos entran como 'pendiente' (la app los marca
--       "Pendiente de confirmación") y quedan atados a quien los subió (uploaded_by).
--    b) Límite de envíos (anti-spam): 5 SOS propios y 60 subidas por cuenta cada 10 minutos.
--    c) Fechas: created_at viene del celular; se acota a un rango creíble.
create or replace function public.emergency_reports_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recent int;
begin
  if auth.role() = 'service_role' or auth.uid() is null then
    return new;
  end if;
  new.uploaded_by := auth.uid();

  if new.author_id is distinct from auth.uid() then
    new.review_status := 'pendiente';
    new.review_note := null;
  elsif new.review_status is null or new.review_status not in ('pendiente', 'aprobado') then
    new.review_status := 'aprobado';
  end if;

  if new.created_at is null or new.created_at > now() + interval '5 minutes' or new.created_at < now() - interval '24 hours' then
    new.created_at := now();
  end if;

  select count(*) into recent from public.emergency_reports
   where uploaded_by = auth.uid() and updated_at > now() - interval '10 minutes';
  if recent >= 60 then
    raise exception 'Demasiados reportes seguidos. Espera unos minutos.' using errcode = 'P0001';
  end if;
  if new.kind = 'sos' and new.author_id = auth.uid() then
    select count(*) into recent from public.emergency_reports
     where author_id = auth.uid() and kind = 'sos' and updated_at > now() - interval '10 minutes';
    if recent >= 5 then
      raise exception 'Ya enviaste varios SOS. Tus vecinos ya fueron avisados.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.emergency_reports_guard() from public, anon, authenticated;
drop trigger if exists emergency_reports_guard on public.emergency_reports;
create trigger emergency_reports_guard before insert on public.emergency_reports
  for each row execute function public.emergency_reports_guard();

--    d) Estado: cualquier vecino puede marcar "voy en camino" (atendiendo), pero solo el autor o la
--       junta pueden cerrar un SOS como resuelto (antes cualquiera podía ocultar el SOS de otro).
create or replace function public.emergency_reports_protect()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_status text := new.status;
  new_review text := new.review_status;
  new_note text := new.review_note;
  can_close boolean;
begin
  if auth.role() = 'service_role' or auth.uid() is null then
    return new;
  end if;
  can_close := old.author_id = auth.uid() or public.is_zone_admin(old.zone_id);
  new := old;
  if new_status is distinct from old.status and (can_close or new_status = 'atendiendo') then
    new.status := new_status;
  end if;
  if public.is_zone_admin(old.zone_id)
     and new_review is distinct from old.review_status
     and new_review in ('aprobado','rechazado') then
    new.review_status := new_review;
    new.review_note := left(coalesce(new_note, ''), 200);
    insert into public.moderation_log (entity, entity_id, decision, moderator_id, reason)
    values ('emergency_report', new.id, new.review_status, auth.uid(), new.review_note);
  end if;
  return new;
end $$;
revoke execute on function public.emergency_reports_protect() from public, anon, authenticated;

-- 3) Quadri Points: quien ofrece ayuda podía marcar SU PROPIA oferta como 'completado' y regalarse
--    +5 puntos. Ahora solo el autor del favor acepta, agradece o completa; quien ofrece solo puede
--    retirar o volver a ofrecer. Las ofertas nuevas siempre nacen 'propuesto'.
create or replace function public.favor_responses_protect()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_author boolean;
begin
  if public.ayni_internal() or auth.role() = 'service_role' or auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'propuesto';
    new.thanks_message := null;
    return new;
  end if;
  new.favor_id := old.favor_id;
  new.responder_id := old.responder_id;
  if new.status is distinct from old.status then
    select exists (select 1 from public.favors f where f.id = old.favor_id and f.author_id = auth.uid()) into is_author;
    if is_author and new.status in ('aceptado', 'agradecido', 'completado') then
      null; -- permitido
    elsif old.responder_id = auth.uid() and new.status in ('retirado', 'propuesto') and old.status in ('propuesto', 'retirado') then
      null; -- retirar o volver a ofrecer
    else
      new.status := old.status;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.favor_responses_protect() from public, anon, authenticated;
drop trigger if exists favor_responses_protect on public.favor_responses;
create trigger favor_responses_protect before insert or update on public.favor_responses
  for each row execute function public.favor_responses_protect();

-- 4) PIN de la junta vecinal: era de 4 dígitos y sin límite de intentos (10 000 combinaciones se prueban
--    en minutos). Ahora: máximo 5 intentos por cuenta cada hora.
create table if not exists public.admin_claim_attempts (
  user_id uuid not null,
  at timestamptz not null default now()
);
create index if not exists admin_claim_attempts_user_at on public.admin_claim_attempts (user_id, at);
alter table public.admin_claim_attempts enable row level security;
revoke all on public.admin_claim_attempts from anon, authenticated;

create or replace function public.claim_zone_admin(p_zone uuid, p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  ok boolean;
  tries int;
begin
  if auth.uid() is null then return false; end if;
  select count(*) into tries from public.admin_claim_attempts where user_id = auth.uid() and at > now() - interval '1 hour';
  if tries >= 5 then return false; end if;
  insert into public.admin_claim_attempts (user_id) values (auth.uid());
  select exists (select 1 from public.zone_admin_codes where zone_id = p_zone and code = p_code) into ok;
  if not ok then return false; end if;
  perform set_config('ayni.internal', '1', true);
  update public.profiles set is_zone_admin = true, zone_id = p_zone where id = auth.uid();
  perform set_config('ayni.internal', '', true);
  return found;
end $$;
revoke execute on function public.claim_zone_admin(uuid, text) from public, anon;
grant execute on function public.claim_zone_admin(uuid, text) to authenticated;

-- 5) Tablas internas: además de RLS sin políticas, sin permisos para los roles de la API.
revoke all on public.zone_admin_codes from anon, authenticated;
revoke all on public.sensitive_points from anon, authenticated;
revoke all on public.profile_private from anon, authenticated;

-- Revisión vecinal, DNI privado y coordenadas de zona.
-- Lo que ya estaba publicado (semilla) queda aprobado. Las publicaciones nuevas
-- quedan pendientes, salvo la junta vecinal o una cuenta con Modo demo.

create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────── Columnas ─────────────────────────

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists demo_mode boolean not null default false,
  add column if not exists public_home_lat double precision,
  add column if not exists public_home_lng double precision;

alter table public.listings
  add column if not exists review_status text not null default 'aprobado',
  add column if not exists review_note text,
  add column if not exists public_lat double precision,
  add column if not exists public_lng double precision;

alter table public.favors
  add column if not exists review_status text not null default 'aprobado',
  add column if not exists review_note text,
  add column if not exists public_lat double precision,
  add column if not exists public_lng double precision;

alter table public.emergency_reports
  add column if not exists review_status text not null default 'aprobado',
  add column if not exists review_note text,
  add column if not exists public_lat double precision,
  add column if not exists public_lng double precision;

alter table public.favor_responses
  add column if not exists public_lat double precision,
  add column if not exists public_lng double precision;

alter table public.listings drop constraint if exists listings_review_chk;
alter table public.listings add constraint listings_review_chk check (review_status in ('pendiente','aprobado','rechazado'));
alter table public.favors drop constraint if exists favors_review_chk;
alter table public.favors add constraint favors_review_chk check (review_status in ('pendiente','aprobado','rechazado'));
alter table public.emergency_reports drop constraint if exists emergency_review_chk;
alter table public.emergency_reports add constraint emergency_review_chk check (review_status in ('pendiente','aprobado','rechazado'));

-- Las filas nuevas de vecinos reales quedan pendientes. La semilla (sin auth.uid) conserva 'aprobado'.
alter table public.listings alter column review_status set default 'pendiente';
alter table public.favors alter column review_status set default 'pendiente';
alter table public.emergency_reports alter column review_status set default 'pendiente';

-- ───────────────────────── Zona pública (~250 m) ─────────────────────────

create or replace function public.public_lat(lat double precision)
returns double precision language sql immutable as $$
  select case when lat is null then null
    else round(lat / (250.0 / 111320.0)) * (250.0 / 111320.0) end
$$;

create or replace function public.public_lng(lat double precision, lng double precision)
returns double precision language sql immutable as $$
  select case when lat is null or lng is null then null
    else round(lng / (250.0 / (111320.0 * cos(radians(lat))))) * (250.0 / (111320.0 * cos(radians(lat)))) end
$$;

revoke execute on function public.public_lat(double precision) from public, anon, authenticated;
revoke execute on function public.public_lng(double precision, double precision) from public, anon, authenticated;

update public.profiles set
  public_home_lat = public.public_lat(home_lat),
  public_home_lng = public.public_lng(home_lat, home_lng)
where home_lat is not null and public_home_lat is null;

update public.listings set public_lat = public.public_lat(lat), public_lng = public.public_lng(lat, lng) where public_lat is null;
update public.favors set public_lat = public.public_lat(lat), public_lng = public.public_lng(lat, lng) where public_lat is null;
update public.emergency_reports set public_lat = public.public_lat(lat), public_lng = public.public_lng(lat, lng) where public_lat is null;
update public.favor_responses set public_lat = public.public_lat(lat), public_lng = public.public_lng(lat, lng) where public_lat is null;

-- Coordenada y teléfono exactos. Nadie los lee por la API: solo funciones internas.
create table if not exists public.sensitive_points (
  entity text not null,
  entity_id uuid not null,
  lat double precision,
  lng double precision,
  phone text,
  updated_at timestamptz not null default now(),
  primary key (entity, entity_id)
);
alter table public.sensitive_points enable row level security;
revoke all on public.sensitive_points from public, anon, authenticated;

create table if not exists public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('listing','favor','emergency_report')),
  entity_id uuid not null,
  decision text not null check (decision in ('aprobado','rechazado')),
  moderator_id uuid,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.moderation_log enable row level security;
revoke insert, update, delete on public.moderation_log from public, anon, authenticated;
drop policy if exists moderation_log_select on public.moderation_log;
create policy moderation_log_select on public.moderation_log for select to authenticated
  using (moderator_id = auth.uid() or public.is_zone_admin(public.my_zone_id()));

create table if not exists public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  dni_hash text not null,
  dni_last4 text not null check (dni_last4 ~ '^[0-9]{4}$'),
  updated_at timestamptz not null default now()
);
alter table public.profile_private enable row level security;
revoke all on public.profile_private from public, anon, authenticated;

-- ───────────────────────── Guardar el dato exacto y publicar la zona ─────────────────────────

create or replace function public.stash_exact(p_entity text, p_id uuid, p_lat double precision, p_lng double precision, p_phone text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.sensitive_points (entity, entity_id, lat, lng, phone)
  values (p_entity, p_id, p_lat, p_lng, p_phone)
  on conflict (entity, entity_id) do update
    set lat = excluded.lat,
        lng = excluded.lng,
        phone = coalesce(excluded.phone, public.sensitive_points.phone),
        updated_at = now();
end $$;
revoke execute on function public.stash_exact(text, uuid, double precision, double precision, text) from public, anon, authenticated;

-- Semilla (sin usuario) conserva el punto exacto. Una cuenta real publica solo la zona.
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
begin
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

drop trigger if exists listings_zz_snap on public.listings;
create trigger listings_zz_snap before insert or update on public.listings
  for each row execute function public.snap_public_point();
drop trigger if exists favors_zz_snap on public.favors;
create trigger favors_zz_snap before insert or update on public.favors
  for each row execute function public.snap_public_point();
drop trigger if exists favor_responses_zz_snap on public.favor_responses;
create trigger favor_responses_zz_snap before insert or update on public.favor_responses
  for each row execute function public.snap_public_point();
drop trigger if exists emergency_reports_zz_snap on public.emergency_reports;
create trigger emergency_reports_zz_snap before insert or update on public.emergency_reports
  for each row execute function public.snap_public_point();

-- Casa y teléfono: igual que las publicaciones.
create or replace function public.profiles_protect()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.ayni_internal() or auth.role() = 'service_role' then
    new.public_home_lat := public.public_lat(new.home_lat);
    new.public_home_lng := public.public_lng(new.home_lat, new.home_lng);
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.aynis := 0;
    new.is_zone_admin := false;
  else
    new.aynis := old.aynis;
    new.is_zone_admin := old.is_zone_admin;
  end if;
  new.public_home_lat := public.public_lat(new.home_lat);
  new.public_home_lng := public.public_lng(new.home_lat, new.home_lng);
  if auth.uid() is not null and new.home_lat is not null then
    perform public.stash_exact('profile', new.id, new.home_lat, new.home_lng, new.phone_whatsapp);
    new.home_lat := new.public_home_lat;
    new.home_lng := new.public_home_lng;
    new.phone_whatsapp := null;
  end if;
  return new;
end $$;

-- ───────────────────────── Revisión ─────────────────────────

create or replace function public.enforce_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  author uuid;
  allowed boolean;
  ent text;
begin
  if public.ayni_internal() or auth.role() = 'service_role' or auth.uid() is null then
    if new.review_status is null then new.review_status := 'aprobado'; end if;
    return new;
  end if;

  if tg_table_name = 'listings' then author := new.owner_id; ent := 'listing';
  else author := new.author_id;
    ent := case tg_table_name when 'favors' then 'favor' else 'emergency_report' end;
  end if;

  allowed := public.is_zone_admin(new.zone_id)
    or (author = auth.uid() and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.demo_mode
    ));

  if tg_op = 'INSERT' then
    if not allowed then
      new.review_status := 'pendiente';
    elsif new.review_status is null or new.review_status not in ('pendiente','aprobado','rechazado') then
      new.review_status := 'aprobado';
    end if;
  elsif new.review_status is distinct from old.review_status then
    if not public.is_zone_admin(coalesce(new.zone_id, old.zone_id)) then
      new.review_status := old.review_status;
      new.review_note := old.review_note;
    elsif new.review_status in ('aprobado','rechazado') then
      insert into public.moderation_log (entity, entity_id, decision, moderator_id, reason)
      values (ent, new.id, new.review_status, auth.uid(), left(coalesce(new.review_note, ''), 200));
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.enforce_review() from public, anon, authenticated;

drop trigger if exists listings_review on public.listings;
create trigger listings_review before insert or update on public.listings
  for each row execute function public.enforce_review();
drop trigger if exists favors_review on public.favors;
create trigger favors_review before insert or update on public.favors
  for each row execute function public.enforce_review();
drop trigger if exists emergency_reports_review on public.emergency_reports;
create trigger emergency_reports_review before insert on public.emergency_reports
  for each row execute function public.enforce_review();

-- En un reporte de emergencia solo cambian el estado y, si eres junta, la revisión.
create or replace function public.emergency_reports_protect()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_status text := new.status;
  new_review text := new.review_status;
  new_note text := new.review_note;
begin
  if auth.role() = 'service_role' or auth.uid() is null then
    return new;
  end if;
  new := old;
  new.status := new_status;
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

-- El Visto Bueno usa la casa y el local exactos, si los guardamos aparte.
create or replace function public.vistos_buenos_validate()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_home extensions.geography;
  v_loc extensions.geography;
  v_owner uuid;
  v_lat double precision;
  v_lng double precision;
begin
  if tg_op = 'UPDATE' then
    new.listing_id := old.listing_id;
    new.voter_id := old.voter_id;
    new.distance_m := old.distance_m;
    return new;
  end if;

  select owner_id into v_owner from public.listings where id = new.listing_id;
  if v_owner = new.voter_id then
    raise exception 'No puedes dar Visto Bueno a tu propia publicación';
  end if;

  select lat, lng into v_lat, v_lng from public.sensitive_points
    where entity = 'profile' and entity_id = new.voter_id;
  if v_lat is not null then
    v_home := extensions.st_setsrid(extensions.st_makepoint(v_lng, v_lat), 4326)::extensions.geography;
  else
    select home into v_home from public.profiles where id = new.voter_id;
  end if;
  if v_home is null then
    raise exception 'Primero confirma la ubicación de tu casa';
  end if;

  select lat, lng into v_lat, v_lng from public.sensitive_points
    where entity = 'listing' and entity_id = new.listing_id;
  if v_lat is not null then
    v_loc := extensions.st_setsrid(extensions.st_makepoint(v_lng, v_lat), 4326)::extensions.geography;
  else
    select location into v_loc from public.listings where id = new.listing_id;
  end if;

  new.distance_m := round(extensions.st_distance(v_home, v_loc))::int;
  if new.distance_m > 1500 then
    raise exception 'Solo vecinos a menos de 1.5 km pueden dar Visto Bueno';
  end if;
  return new;
end $$;

-- ───────────────────────── DNI: solo el hash, y los últimos 4 dígitos ─────────────────────────

create or replace function public.save_my_dni(p_dni text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  clean text := regexp_replace(coalesce(p_dni, ''), '\D', '', 'g');
  hashed text;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión';
  end if;
  if clean !~ '^[0-9]{8}$' then
    raise exception 'El DNI debe tener 8 dígitos';
  end if;
  hashed := encode(extensions.digest(convert_to(clean || auth.uid()::text || 'quadra-dni-v1', 'utf8'), 'sha256'), 'hex');
  insert into public.profile_private (user_id, dni_hash, dni_last4)
  values (auth.uid(), hashed, right(clean, 4))
  on conflict (user_id) do update
    set dni_hash = excluded.dni_hash, dni_last4 = excluded.dni_last4, updated_at = now();
  return right(clean, 4);
end $$;
revoke all on function public.save_my_dni(text) from public, anon;
grant execute on function public.save_my_dni(text) to authenticated;

create or replace function public.my_dni_last4()
returns text language sql stable security definer set search_path = public as $$
  select dni_last4 from public.profile_private where user_id = auth.uid()
$$;
revoke all on function public.my_dni_last4() from public, anon;
grant execute on function public.my_dni_last4() to authenticated;

-- Teléfono de un servicio aprobado, solo al tocarlo. No viaja en el listado.
create or replace function public.contact_listing(p_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare v_phone text;
begin
  if auth.uid() is null then return null; end if;
  if not exists (
    select 1 from public.listings l
    where l.id = p_id and l.is_active and l.review_status = 'aprobado'
      and (l.zone_id = public.my_zone_id() or l.owner_id = auth.uid())
  ) then
    return null;
  end if;
  select phone into v_phone from public.sensitive_points where entity = 'listing' and entity_id = p_id;
  if v_phone is null then
    select coalesce(l.whatsapp, pr.phone_whatsapp) into v_phone
    from public.listings l
    left join public.profiles pr on pr.id = l.owner_id
    where l.id = p_id;
  end if;
  return v_phone;
end $$;
revoke all on function public.contact_listing(uuid) from public, anon;
grant execute on function public.contact_listing(uuid) to authenticated;

-- Ubicación y teléfono de una oferta, solo para quien pidió y para quien fue elegido.
create or replace function public.contact_response(p_id uuid)
returns table (lat double precision, lng double precision, phone text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_favor uuid;
  v_responder uuid;
  v_status text;
  v_author uuid;
begin
  if auth.uid() is null then return; end if;
  select r.favor_id, r.responder_id, r.status into v_favor, v_responder, v_status
  from public.favor_responses r where r.id = p_id;
  if v_status not in ('aceptado','completado') then return; end if;
  select f.author_id into v_author from public.favors f where f.id = v_favor;
  if auth.uid() <> v_author and auth.uid() <> v_responder then return; end if;

  lat := (select s.lat from public.sensitive_points s where s.entity = 'favor_response' and s.entity_id = p_id);
  lng := (select s.lng from public.sensitive_points s where s.entity = 'favor_response' and s.entity_id = p_id);
  phone := (select s.phone from public.sensitive_points s where s.entity = 'profile' and s.entity_id = v_responder);
  if lat is null then
    select r.lat, r.lng into lat, lng from public.favor_responses r where r.id = p_id;
  end if;
  if phone is null then
    select pr.phone_whatsapp into phone from public.profiles pr where pr.id = v_responder;
  end if;
  return next;
end $$;
revoke all on function public.contact_response(uuid) from public, anon;
grant execute on function public.contact_response(uuid) to authenticated;

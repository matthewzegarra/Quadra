-- Ayni · esquema inicial (prompt.md §5)
-- Decisión: lat/lng son las columnas que escribe el cliente (igual que en SQLite) y
-- `location` es una columna geography GENERADA a partir de ellas. Así la sincronización
-- no necesita convertir WKB/WKT y PostGIS sigue sirviendo para índices y distancias.
-- updated_at lo fija SIEMPRE el servidor (now()): el pull incremental no depende del reloj del celular.

create extension if not exists postgis with schema extensions;

-- ───────────────────────── Tablas ─────────────────────────

create table public.zones (
  id uuid primary key,
  name text not null,
  district text not null,
  lat double precision not null,
  lng double precision not null,
  center extensions.geography(point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  radius_m int not null default 1500,
  emergency_active boolean not null default false,
  emergency_type text check (emergency_type in ('sismo','inundacion','incendio','otro')),
  emergency_started_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  phone_whatsapp text,
  zone_id uuid references public.zones(id),
  home_lat double precision,
  home_lng double precision,
  home extensions.geography(point, 4326)
    generated always as (
      case when home_lat is null or home_lng is null then null
      else extensions.st_setsrid(extensions.st_makepoint(home_lng, home_lat), 4326)::extensions.geography end
    ) stored,
  is_zone_admin boolean not null default false,
  is_vulnerable boolean not null default false,
  aynis int not null default 0,
  easy_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MÓDULO 1: Servicios de Proximidad
create table public.listings (
  id uuid primary key,
  owner_id uuid references public.profiles(id) on delete set null,
  zone_id uuid references public.zones(id),
  kind text not null check (kind in ('servicio','producto')),
  category text not null,
  title text not null,
  description text,
  price_hint text,
  schedule text,
  lat double precision not null,
  lng double precision not null,
  location extensions.geography(point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  whatsapp text,
  available_in_emergency boolean not null default false,
  emergency_capability text,
  visto_bueno_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vistos_buenos (
  id uuid primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  comment text,
  distance_m int not null default 0, -- lo recalcula el servidor (trigger)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, voter_id)
);

-- MÓDULO 2: Cadena de Favores
create table public.favors (
  id uuid primary key,
  author_id uuid references public.profiles(id) on delete set null,
  zone_id uuid references public.zones(id),
  type text not null check (type in ('pido','ofrezco','presto','dono','intercambio','movilidad')),
  category text not null,
  title text not null,
  description text,
  lat double precision not null,
  lng double precision not null,
  location extensions.geography(point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  status text not null default 'abierto' check (status in ('abierto','en_curso','resuelto')),
  accepted_response_id uuid, -- FK agregada después de crear favor_responses
  mobility_destination text,
  mobility_days text[],
  mobility_time text,
  mobility_role text check (mobility_role in ('llevo','recojo','busco')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.favor_responses (
  id uuid primary key,
  favor_id uuid not null references public.favors(id) on delete cascade,
  responder_id uuid not null references public.profiles(id) on delete cascade,
  responder_name text,
  message text,
  lat double precision not null,
  lng double precision not null,
  location extensions.geography(point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  location_source text not null default 'gps' check (location_source in ('gps','mapa')),
  location_label text,
  distance_m int not null,
  status text not null default 'propuesto'
    check (status in ('propuesto','aceptado','agradecido','completado','retirado')),
  thanks_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (favor_id, responder_id)
);

alter table public.favors
  add constraint favors_accepted_response_fk
  foreign key (accepted_response_id) references public.favor_responses(id) on delete set null;

-- MODO EMERGENCIA
create table public.emergency_reports (
  id uuid primary key, -- el MISMO id viaja por el mesh (idempotencia)
  author_id uuid, -- sin FK: un reporte mesh puede llegar antes que el perfil de su autor
  author_name text,
  zone_id uuid references public.zones(id),
  kind text not null check (kind in ('sos','estoy_bien','vulnerable','recurso_necesito','recurso_ofrezco')),
  need text,
  description text,
  people_count int default 1,
  priority int not null default 2 check (priority between 1 and 3),
  lat double precision not null,
  lng double precision not null,
  location extensions.geography(point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  status text not null default 'abierto' check (status in ('abierto','atendiendo','resuelto')),
  origin text not null default 'online' check (origin in ('online','mesh','sms')),
  mesh_hops int default 0,
  uploaded_by uuid default auth.uid(), -- quién lo subió (puede ser un "cartero" del mesh)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Aynis (reputación solidaria): solo lo escriben los triggers
create table public.ayni_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null,
  reason text not null, -- 'favor_completado','visto_bueno_recibido','ofrecio_ayuda','respondio_emergencia'
  ref_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reason, ref_id) -- un mismo hecho no suma dos veces
);

-- ───────────────────────── Índices ─────────────────────────

create index zones_center_gix on public.zones using gist (center);
create index profiles_home_gix on public.profiles using gist (home);
create index listings_location_gix on public.listings using gist (location);
create index favors_location_gix on public.favors using gist (location);
create index favor_responses_location_gix on public.favor_responses using gist (location);
create index emergency_reports_location_gix on public.emergency_reports using gist (location);

create index listings_zone_updated_idx on public.listings (zone_id, updated_at);
create index favors_zone_updated_idx on public.favors (zone_id, updated_at);
create index favor_responses_favor_idx on public.favor_responses (favor_id);
create index emergency_reports_zone_updated_idx on public.emergency_reports (zone_id, updated_at);
create index vistos_buenos_listing_idx on public.vistos_buenos (listing_id);
create index ayni_ledger_user_idx on public.ayni_ledger (user_id);
create index profiles_zone_idx on public.profiles (zone_id);

-- ───────────────────────── Helpers ─────────────────────────

-- Zona del usuario actual (security definer para no recursar en RLS de profiles)
create or replace function public.my_zone_id()
returns uuid language sql stable security definer set search_path = public as $$
  select zone_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_zone_admin(p_zone uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_zone_admin and zone_id = p_zone from public.profiles where id = auth.uid()), false)
$$;

-- Marca interna para que los triggers puedan tocar columnas protegidas (aynis, contadores)
create or replace function public.ayni_internal()
returns boolean language sql stable as $$
  select coalesce(current_setting('ayni.internal', true), '') = '1'
$$;

-- ───────────────────────── Triggers genéricos ─────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['zones','profiles','listings','vistos_buenos','favors','favor_responses','emergency_reports','ayni_ledger']
  loop
    execute format('create trigger %I_set_updated_at before insert or update on public.%I
                    for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- profiles: el vecino no puede darse Aynis ni hacerse admin
create or replace function public.profiles_protect()
returns trigger language plpgsql as $$
begin
  if public.ayni_internal() or auth.role() = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.aynis := 0;
    new.is_zone_admin := false;
  else
    new.aynis := old.aynis;
    new.is_zone_admin := old.is_zone_admin;
  end if;
  return new;
end $$;
create trigger profiles_protect before insert or update on public.profiles
  for each row execute function public.profiles_protect();

-- listings: el contador de vistos buenos solo lo mueve el trigger
create or replace function public.listings_protect()
returns trigger language plpgsql as $$
begin
  if public.ayni_internal() or auth.role() = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.visto_bueno_count := 0;
  else
    new.visto_bueno_count := old.visto_bueno_count;
  end if;
  return new;
end $$;
create trigger listings_protect before insert or update on public.listings
  for each row execute function public.listings_protect();

-- emergency_reports: nunca se pisan; en UPDATE solo cambia status
create or replace function public.emergency_reports_protect()
returns trigger language plpgsql as $$
declare new_status text := new.status;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  new := old;
  new.status := new_status;
  return new;
end $$;
create trigger emergency_reports_protect before update on public.emergency_reports
  for each row execute function public.emergency_reports_protect();

-- ───────────────────────── Aynis ─────────────────────────

create or replace function public.grant_aynis(p_user uuid, p_delta int, p_reason text, p_ref uuid)
returns void language plpgsql security definer set search_path = public as $$
declare inserted int;
begin
  if p_user is null then return; end if;
  insert into public.ayni_ledger (user_id, delta, reason, ref_id)
  values (p_user, p_delta, p_reason, p_ref)
  on conflict (user_id, reason, ref_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted > 0 then
    perform set_config('ayni.internal', '1', true);
    update public.profiles set aynis = aynis + p_delta where id = p_user;
    perform set_config('ayni.internal', '', true);
  end if;
end $$;
revoke execute on function public.grant_aynis(uuid, int, text, uuid) from public, anon, authenticated;

-- ───────────────────────── Visto Bueno Vecinal ─────────────────────────
-- Regla real: el votante vive a ≤ 1.5 km y no es el dueño. La distancia la calcula el servidor.

create or replace function public.vistos_buenos_validate()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_home extensions.geography;
  v_listing record;
begin
  if tg_op = 'UPDATE' then
    -- solo se puede editar el comentario
    new.listing_id := old.listing_id;
    new.voter_id := old.voter_id;
    new.distance_m := old.distance_m;
    return new;
  end if;

  select home into v_home from public.profiles where id = new.voter_id;
  select owner_id, location into v_listing from public.listings where id = new.listing_id;

  if v_listing.owner_id = new.voter_id then
    raise exception 'No puedes dar Visto Bueno a tu propia publicación';
  end if;
  if v_home is null then
    raise exception 'Primero confirma la ubicación de tu casa';
  end if;
  new.distance_m := round(extensions.st_distance(v_home, v_listing.location))::int;
  if new.distance_m > 1500 then
    raise exception 'Solo vecinos a menos de 1.5 km pueden dar Visto Bueno';
  end if;
  return new;
end $$;
create trigger vistos_buenos_validate before insert or update on public.vistos_buenos
  for each row execute function public.vistos_buenos_validate();

create or replace function public.vistos_buenos_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  perform set_config('ayni.internal', '1', true);
  if tg_op = 'INSERT' then
    update public.listings set visto_bueno_count = visto_bueno_count + 1
      where id = new.listing_id returning owner_id into v_owner;
    perform public.grant_aynis(v_owner, 2, 'visto_bueno_recibido', new.id);
  elsif tg_op = 'DELETE' then
    update public.listings set visto_bueno_count = greatest(visto_bueno_count - 1, 0)
      where id = old.listing_id;
  end if;
  perform set_config('ayni.internal', '', true);
  return null;
end $$;
create trigger vistos_buenos_after after insert or delete on public.vistos_buenos
  for each row execute function public.vistos_buenos_after();

-- ───────────────────────── Cadena de Favores: Aynis por estado ─────────────────────────
-- agradecido (ofreció pero no fue elegido) +1 · completado (ayudó) +5

create or replace function public.favor_responses_aynis()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'agradecido' then
      perform public.grant_aynis(new.responder_id, 1, 'ofrecio_ayuda', new.id);
    elsif new.status = 'completado' then
      perform public.grant_aynis(new.responder_id, 5, 'favor_completado', new.id);
    end if;
  end if;
  return null;
end $$;
create trigger favor_responses_aynis after update on public.favor_responses
  for each row execute function public.favor_responses_aynis();

-- ───────────────────────── RPC de cercanía ─────────────────────────

create or replace function public.nearby_listings(
  lat double precision, lng double precision, radius_m int default 1500, category text default null
)
returns table (listing public.listings, distance_m int)
language sql stable security invoker set search_path = public, extensions as $$
  with me as (
    select st_setsrid(st_makepoint(nearby_listings.lng, nearby_listings.lat), 4326)::geography as g
  )
  select l as listing, round(st_distance(l.location, me.g))::int as distance_m
  from public.listings l, me
  where l.is_active
    and (nearby_listings.category is null or l.category = nearby_listings.category)
    and st_dwithin(l.location, me.g, nearby_listings.radius_m)
  order by 2
$$;

create or replace function public.nearby_favors(
  lat double precision, lng double precision, radius_m int default 1500, type text default null
)
returns table (favor public.favors, distance_m int)
language sql stable security invoker set search_path = public, extensions as $$
  with me as (
    select st_setsrid(st_makepoint(nearby_favors.lng, nearby_favors.lat), 4326)::geography as g
  )
  select f as favor, round(st_distance(f.location, me.g))::int as distance_m
  from public.favors f, me
  where f.status <> 'resuelto'
    and (nearby_favors.type is null or f.type = nearby_favors.type)
    and st_dwithin(f.location, me.g, nearby_favors.radius_m)
  order by 2
$$;

-- ───────────────────────── RLS ─────────────────────────

alter table public.zones enable row level security;
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.vistos_buenos enable row level security;
alter table public.favors enable row level security;
alter table public.favor_responses enable row level security;
alter table public.emergency_reports enable row level security;
alter table public.ayni_ledger enable row level security;

-- zones: todos los autenticados leen (para elegir zona); solo admin de esa zona edita
create policy zones_select on public.zones for select to authenticated using (true);
create policy zones_update_admin on public.zones for update to authenticated
  using (public.is_zone_admin(id)) with check (public.is_zone_admin(id));

-- profiles: leo los de mi zona y el mío; escribo solo el mío
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or zone_id = public.my_zone_id());
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- listings
create policy listings_select on public.listings for select to authenticated
  using (zone_id = public.my_zone_id() or owner_id = auth.uid());
create policy listings_insert on public.listings for insert to authenticated
  with check (owner_id = auth.uid());
create policy listings_update on public.listings for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy listings_delete on public.listings for delete to authenticated
  using (owner_id = auth.uid());

-- vistos_buenos
create policy vistos_buenos_select on public.vistos_buenos for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id
                 and (l.zone_id = public.my_zone_id() or l.owner_id = auth.uid())));
create policy vistos_buenos_insert on public.vistos_buenos for insert to authenticated
  with check (voter_id = auth.uid());
create policy vistos_buenos_update on public.vistos_buenos for update to authenticated
  using (voter_id = auth.uid()) with check (voter_id = auth.uid());
create policy vistos_buenos_delete on public.vistos_buenos for delete to authenticated
  using (voter_id = auth.uid());

-- favors
create policy favors_select on public.favors for select to authenticated
  using (zone_id = public.my_zone_id() or author_id = auth.uid());
create policy favors_insert on public.favors for insert to authenticated
  with check (author_id = auth.uid());
create policy favors_update on public.favors for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- favor_responses: las ve quien ofrece y quien pidió; el que pidió cambia el estado (elegir/agradecer)
create policy favor_responses_select on public.favor_responses for select to authenticated
  using (
    responder_id = auth.uid()
    or exists (select 1 from public.favors f where f.id = favor_id
               and (f.author_id = auth.uid() or f.zone_id = public.my_zone_id()))
  );
create policy favor_responses_insert on public.favor_responses for insert to authenticated
  with check (responder_id = auth.uid());
create policy favor_responses_update on public.favor_responses for update to authenticated
  using (
    responder_id = auth.uid()
    or exists (select 1 from public.favors f where f.id = favor_id and f.author_id = auth.uid())
  );

-- emergency_reports: cualquiera de la zona lee; se sube lo propio o lo recibido por mesh;
-- cualquiera de la zona puede cambiar el status (atendiendo/resuelto)
create policy emergency_reports_select on public.emergency_reports for select to authenticated
  using (zone_id = public.my_zone_id() or author_id = auth.uid() or uploaded_by = auth.uid());
create policy emergency_reports_insert on public.emergency_reports for insert to authenticated
  with check (author_id = auth.uid() or origin in ('mesh','sms'));
create policy emergency_reports_update on public.emergency_reports for update to authenticated
  using (zone_id = public.my_zone_id());

-- ayni_ledger: solo lectura (lo escriben los triggers)
create policy ayni_ledger_select on public.ayni_ledger for select to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.profiles p where p.id = user_id and p.zone_id = public.my_zone_id()));

-- ───────────────────────── Realtime ─────────────────────────

alter publication supabase_realtime add table public.emergency_reports;
alter publication supabase_realtime add table public.zones;

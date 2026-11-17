-- Deja la base lista para la demo de la final (correr en el SQL Editor de Supabase o con el MCP).
-- No borra nada: apaga la emergencia y pone los favores de ejemplo como "recién publicados".

-- 1) Modo Emergencia apagado (la junta lo activa en vivo durante la demo)
update public.zones set emergency_active = false where id = 'a0000000-0000-4000-8000-000000000001';

-- 2) Favores de ejemplo con fechas recientes (mismos minutos que src/seed/seed.json)
update public.favors f set created_at = now() - make_interval(mins => v.m)
from (values
  ('d0000000-0000-4000-8000-000000000001'::uuid, 20),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 90),
  ('d0000000-0000-4000-8000-000000000003'::uuid, 180),
  ('d0000000-0000-4000-8000-000000000004'::uuid, 300),
  ('d0000000-0000-4000-8000-000000000005'::uuid, 60),
  ('d0000000-0000-4000-8000-000000000006'::uuid, 45),
  ('d0000000-0000-4000-8000-000000000007'::uuid, 35)
) as v(id, m)
where f.id = v.id;

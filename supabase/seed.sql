-- Datos demo ficticios (generado por scripts/build-seed.mjs; no editar a mano)
-- Aplicar con el rol postgres (SQL Editor o conector de Supabase).
begin;
select set_config('ayni.internal', '1', true);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('b0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('b0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('b0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('b0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('b0000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('b0000000-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('b0000000-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('b0000000-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('b0000000-0000-4000-8000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('b0000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('b0000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('b0000000-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('b0000000-0000-4000-8000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('b0000000-0000-4000-8000-000000000014', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

insert into public.zones (id, name, district, lat, lng, radius_m)
values ('a0000000-0000-4000-8000-000000000001', 'Lince - Sector 3', 'Lince', -12.0846, -77.0353, 1500)
on conflict (id) do update set name = excluded.name;

insert into public.profiles (id, display_name, zone_id, home_lat, home_lng, is_zone_admin, is_vulnerable, aynis)
values
  ('b0000000-0000-4000-8000-000000000001', 'Rosa Quispe', 'a0000000-0000-4000-8000-000000000001', -12.085504, -77.033922, false, false, 18),
  ('b0000000-0000-4000-8000-000000000002', 'Don Pedro Huamán', 'a0000000-0000-4000-8000-000000000001', -12.083786, -77.036035, false, true, 4),
  ('b0000000-0000-4000-8000-000000000003', 'Carla Mendoza', 'a0000000-0000-4000-8000-000000000001', -12.082791, -77.033003, false, false, 12),
  ('b0000000-0000-4000-8000-000000000004', 'Luis Torres', 'a0000000-0000-4000-8000-000000000001', -12.084057, -77.033646, false, false, 27),
  ('b0000000-0000-4000-8000-000000000005', 'Miguel Rojas', 'a0000000-0000-4000-8000-000000000001', -12.085957, -77.038056, false, false, 22),
  ('b0000000-0000-4000-8000-000000000006', 'Ana Flores', 'a0000000-0000-4000-8000-000000000001', -12.082339, -77.039158, false, false, 31),
  ('b0000000-0000-4000-8000-000000000007', 'Jorge Salazar', 'a0000000-0000-4000-8000-000000000001', -12.089122, -77.029788, false, false, 15),
  ('b0000000-0000-4000-8000-000000000008', 'Prof. Lucía Ramos', 'a0000000-0000-4000-8000-000000000001', -12.087313, -77.041271, false, false, 19),
  ('b0000000-0000-4000-8000-000000000009', 'Sofía Paredes', 'a0000000-0000-4000-8000-000000000001', -12.078269, -77.031625, false, false, 9),
  ('b0000000-0000-4000-8000-000000000010', 'Junta Vecinal Lince Sector 3', 'a0000000-0000-4000-8000-000000000001', -12.0846, -77.0353, true, false, 40),
  ('b0000000-0000-4000-8000-000000000011', 'Marco Díaz', 'a0000000-0000-4000-8000-000000000001', -12.082249, -77.03236, false, false, 6),
  ('b0000000-0000-4000-8000-000000000012', 'Raúl Cárdenas', 'a0000000-0000-4000-8000-000000000001', -12.080802, -77.036678, false, false, 11),
  ('b0000000-0000-4000-8000-000000000013', 'Elena Vargas', 'a0000000-0000-4000-8000-000000000001', -12.083696, -77.030707, false, false, 14),
  ('b0000000-0000-4000-8000-000000000014', 'Kevin Ramos', 'a0000000-0000-4000-8000-000000000001', -12.089122, -77.037137, false, false, 3)
on conflict (id) do update set display_name = excluded.display_name, aynis = excluded.aynis;

insert into public.listings (id, owner_id, zone_id, kind, category, title, description, price_hint, schedule, lat, lng, available_in_emergency, emergency_capability, visto_bueno_count)
values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'servicio', 'gasfiteria', 'Luis Torres · Gasfitero', 'Gasfitero · 12 años de experiencia. Fugas, caños, termas y desagües.', 'Desde S/ 40', 'Lun a sáb · 8am a 6pm', -12.084057, -77.033646, true, 'Corta fugas de agua y gas', 5),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'producto', 'comida', 'Lasañas caseras de Rosa', 'Lasaña de carne o de verduras, porción familiar. Pedidos hasta el viernes.', 'S/ 15', 'Sábados', -12.085504, -77.033922, false, null, 7),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'producto', 'comida', 'Pastelitos y alfajores de Rosa', 'Alfajores de maicena, empanaditas dulces y pie de manzana.', 'S/ 2 c/u', 'Todos los días', -12.085414, -77.03383, false, null, 4),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'servicio', 'cerrajeria', 'Miguel Rojas · Cerrajero 24 h', 'Abro puertas, cambio chapas y hago copias de llaves.', 'Desde S/ 30', 'Todos los días · 24 horas', -12.085957, -77.038056, true, 'Abre puertas trabadas', 6),
  ('c0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'servicio', 'salud', 'Ana Flores · Enfermera a domicilio', 'Inyectables, curaciones, control de presión y glucosa.', 'S/ 25', 'Lun a sáb · 7am a 9pm', -12.082339, -77.039158, true, 'Enfermera · primeros auxilios', 7),
  ('c0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'servicio', 'electricidad', 'Jorge Salazar · Electricista', 'Instalaciones, tableros, cortocircuitos. Tengo generador.', 'A convenir', 'Lun a vie · 9am a 6pm', -12.089122, -77.029788, true, 'Electricista · tengo generador', 3),
  ('c0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'servicio', 'clases', 'Clases de matemática · Prof. Lucía', 'Primaria y secundaria. Preparación para exámenes.', 'S/ 20 la hora', 'Lun a vie · 4pm a 8pm', -12.087313, -77.041271, false, null, 5),
  ('c0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'servicio', 'mascotas', 'Paseo de perros con Sofía', 'Paseos de 45 minutos en grupo pequeño por el parque.', 'S/ 10 el paseo', 'Mañanas', -12.078269, -77.031625, false, null, 4),
  ('c0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'servicio', 'carpinteria', 'Raúl Cárdenas · Carpintero', 'Muebles a medida, puertas, arreglos de cajones y repisas.', 'Desde S/ 50', 'Lun a sáb', -12.080802, -77.036678, false, null, 2),
  ('c0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'producto', 'comida', 'Tamales de Doña Elena', 'Tamales de cerdo y de pollo, con su sarsa criolla.', 'S/ 5', 'Domingos en la mañana', -12.083696, -77.030707, false, null, 6),
  ('c0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000001', 'servicio', 'otros', 'Reparación de celulares', 'Cambio de pantalla, batería y pin de carga.', 'Desde S/ 40', 'Lun a sáb · 10am a 7pm', -12.089122, -77.037137, false, null, 1),
  ('c0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'servicio', 'otros', 'Costura y arreglos de ropa', 'Basta, cierres, ajustes y remiendos.', 'Desde S/ 8', 'Lun a vie', -12.083786, -77.030615, false, null, 3),
  ('c0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'servicio', 'clases', 'Inglés para niños', 'Clases divertidas para niños de 6 a 12 años.', 'S/ 18 la hora', 'Sábados · 9am a 1pm', -12.087404, -77.041179, false, null, 2),
  ('c0000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'servicio', 'transporte', 'Mudanzas pequeñas en camioneta', 'Fletes dentro de Lima, ayudo a cargar.', 'A convenir', 'Fines de semana', -12.089031, -77.029696, true, 'Tengo camioneta para traslados', 3),
  ('c0000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000001', 'servicio', 'gasfiteria', 'Gasfitería rápida Kevin', 'Destoro de desagües y cambio de grifería.', 'Desde S/ 35', 'Lun a dom', -12.077365, -77.043568, false, null, 1),
  ('c0000000-0000-4000-8000-000000000016', 'b0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'servicio', 'otros', 'Corte de cabello a domicilio', 'Corte para niños, adultos y adultos mayores.', 'S/ 15', 'Tardes', -12.07836, -77.031717, false, null, 2),
  ('c0000000-0000-4000-8000-000000000017', 'b0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'producto', 'comida', 'Mermeladas caseras', 'Fresa, aguaymanto y piña. Frasco de 250 g.', 'S/ 12', 'Todos los días', -12.083605, -77.030753, false, null, 0),
  ('c0000000-0000-4000-8000-000000000018', 'b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'servicio', 'electricidad', 'Electricista Raúl (Jesús María)', 'Instalaciones eléctricas en general.', 'A convenir', 'Lun a sáb', -12.072843, -77.018764, false, null, 2)
on conflict (id) do update set visto_bueno_count = excluded.visto_bueno_count, title = excluded.title;

insert into public.favors (id, author_id, zone_id, type, category, title, description, lat, lng, mobility_destination, mobility_days, mobility_time, mobility_role, created_at)
values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'pido', 'salud', 'Necesito muletas prestadas por 2 semanas', 'Me lesioné la rodilla. Las devuelvo limpias, ¡gracias vecinos!', -12.083786, -77.036035, null, null, null, null, now() - interval '20 minutes'),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'presto', 'herramientas', 'Presto mi taladro', 'Hoy hasta las 6 pm. Con brocas para pared.', -12.085957, -77.038056, null, null, null, null, now() - interval '90 minutes'),
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'dono', 'materiales', 'Dono ropa de niño (talla 6 a 8)', 'Polos, pantalones y una casaca en buen estado.', -12.078269, -77.031625, null, null, null, null, now() - interval '180 minutes'),
  ('d0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'intercambio', 'habilidades', 'Te enseño Excel, me enseñas a cocinar', 'Puedo enseñarte tablas y fórmulas. Quiero aprender a hacer ají de gallina.', -12.087313, -77.041271, null, null, null, null, now() - interval '300 minutes'),
  ('d0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'movilidad', 'movilidad', 'Llevo al Colegio San Antonio a las 7:15', 'Tengo 2 asientos libres en el auto.', -12.082791, -77.033003, 'Colegio San Antonio', array['lun','mar','mie','jue','vie']::text[], '07:15', 'llevo', now() - interval '60 minutes'),
  ('d0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'movilidad', 'movilidad', 'Busco quién lleve a mi hijo al Colegio San Antonio', 'Mi hijo está en 3.° grado. Puedo compartir la gasolina.', -12.082249, -77.03236, 'Colegio San Antonio', array['lun','mar','mie','jue','vie']::text[], '07:15', 'busco', now() - interval '45 minutes'),
  ('d0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'pido', 'herramientas', 'Necesito un martillo', 'Para hoy · lo devuelvo en la noche.', -12.085504, -77.033922, null, null, null, null, now() - interval '35 minutes')
on conflict (id) do nothing;

insert into public.favor_responses (id, favor_id, responder_id, responder_name, message, lat, lng, location_source, distance_m, created_at)
values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000005', 'Miguel Rojas', 'Lo tengo, pasa cuando quieras', -12.085957, -77.038056, 'gps', 453, now() - interval '30 minutes'),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000006', 'Ana Flores', 'Te lo llevo en la tarde', -12.082339, -77.039158, 'gps', 669, now() - interval '25 minutes'),
  ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000007', 'Jorge Salazar', 'Tengo uno grande y uno chico', -12.089122, -77.029788, 'gps', 602, now() - interval '20 minutes'),
  ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000006', 'Ana Flores', 'Tengo unas muletas de mi mamá, te las presto', -12.082339, -77.039158, 'gps', 376, now() - interval '10 minutes')
on conflict (id) do nothing;

-- PIN de la junta vecinal para la demo (Perfil → "Soy de la junta vecinal")
insert into public.zone_admin_codes (zone_id, code) values ('a0000000-0000-4000-8000-000000000001', '2026')
on conflict (zone_id) do update set code = excluded.code;

commit;

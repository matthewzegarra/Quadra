-- Las sesiones anónimas de Supabase NO son cuentas de Quadra.
-- Con "Allow anonymous sign-ins" activo, cualquiera con la clave pública puede pedir un token anónimo
-- (POST /auth/v1/signup sin correo) y publicar un SOS "aprobado" para todo el barrio, leer nombres de
-- vecinos, etc. (advisor 0012 auth_allow_anonymous_sign_ins). La app ya no usa sesiones anónimas:
-- "Entrar sin cuenta" guarda todo solo en el celular.
--
-- Esta política RESTRICTIVA se suma (AND) a las existentes: un token anónimo no lee ni escribe nada.
-- Complemento obligatorio en el panel: Authentication → Sign In / Providers → desactivar
-- "Allow anonymous sign-ins".

do $$
declare
  t text;
begin
  foreach t in array array[
    'zones', 'profiles', 'listings', 'vistos_buenos', 'favors', 'favor_responses',
    'emergency_reports', 'ayni_ledger', 'moderation_log'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_no_anonymous', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated
         using (coalesce((auth.jwt() ->> ''is_anonymous'')::boolean, false) = false)
         with check (coalesce((auth.jwt() ->> ''is_anonymous'')::boolean, false) = false)',
      t || '_no_anonymous', t
    );
  end loop;
end $$;

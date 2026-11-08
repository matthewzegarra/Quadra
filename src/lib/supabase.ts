import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** false si faltan las variables: la app sigue funcionando 100 % offline. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        storage: Storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/** Sesión ya guardada en el celular. No crea una cuenta anónima. */
export async function restoreSession(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

/**
 * A dónde lleva el botón del correo de confirmación: una página de la landing que dice
 * "¡Listo!" y devuelve al vecino a la app. Tiene que estar en Supabase → Auth → URL Configuration
 * (Redirect URLs); si no, Supabase usa la "Site URL" (por defecto localhost:3000).
 */
export const AUTH_REDIRECT_URL = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || 'https://quadra-peak.vercel.app/confirmado';

export type AuthResult =
  | { id: string }
  /** La cuenta existe pero falta abrir el correo (solo si "Confirm email" está activo en Supabase). */
  | { needsConfirmation: true }
  | { error: string };

/** Traduce los errores de Supabase Auth a lenguaje de vecino. Nunca muestra jerga técnica. */
function authError(message: string, code?: string): string {
  const m = `${code ?? ''} ${message}`.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid_credentials')) return 'El correo o la contraseña no coinciden. Revisa y vuelve a intentar.';
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user_already_exists'))
    return 'Ese correo ya tiene cuenta. Toca “Ya tengo cuenta” y entra con tu contraseña.';
  if (m.includes('rate limit') || m.includes('over_email_send_rate') || m.includes('too many'))
    return 'Hiciste varios intentos seguidos. Espera unos minutos y vuelve a probar.';
  if (m.includes('weak') || m.includes('password')) return 'Usa una contraseña de al menos 8 letras o números.';
  if (m.includes('email') && (m.includes('invalid') || m.includes('format'))) return 'Ese correo no parece válido. Revísalo.';
  if (m.includes('signup') && m.includes('disabled')) return 'Por ahora no se pueden crear cuentas. Entra solo en este celular.';
  if (m.includes('network') || m.includes('fetch')) return 'Sin conexión. Puedes entrar solo en este celular.';
  return 'No pudimos entrar. Revisa el correo y la contraseña.';
}

const isUnconfirmed = (message: string, code?: string) => `${code ?? ''} ${message}`.toLowerCase().includes('not confirmed') || code === 'email_not_confirmed';

/** Crea la cuenta o entra. Hace falta internet. */
export async function signInWithEmail(email: string, password: string, mode: 'signup' | 'login'): Promise<AuthResult> {
  if (!supabase) return { error: 'Falta configurar Supabase en este celular.' };
  const mail = email.trim().toLowerCase();
  try {
    if (mode === 'signup') {
      const created = await supabase.auth.signUp({ email: mail, password, options: { emailRedirectTo: AUTH_REDIRECT_URL } });
      if (created.error) return { error: authError(created.error.message, created.error.code) };
      if (created.data.session?.user.id) return { id: created.data.session.user.id };
      // Sin sesión = Supabase pide confirmar el correo antes de entrar
      return { needsConfirmation: true };
    }
    const signed = await supabase.auth.signInWithPassword({ email: mail, password });
    if (signed.error) {
      if (isUnconfirmed(signed.error.message, signed.error.code)) return { needsConfirmation: true };
      return { error: authError(signed.error.message, signed.error.code) };
    }
    if (!signed.data.user) return { error: 'No pudimos entrar.' };
    return { id: signed.data.user.id };
  } catch {
    return { error: 'Sin conexión. Puedes entrar solo en este celular.' };
  }
}

/** Vuelve a enviar el correo de confirmación. */
export async function resendConfirmation(email: string): Promise<string | null> {
  if (!supabase) return 'Falta configurar Supabase en este celular.';
  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase(), options: { emailRedirectTo: AUTH_REDIRECT_URL } });
    return error ? authError(error.message, error.code) : null;
  } catch {
    return 'Sin conexión. Inténtalo cuando tengas señal.';
  }
}

/** Nombre y WhatsApp guardados en el servidor (al entrar desde un celular nuevo). */
export async function fetchMyRemoteProfile(
  id: string,
): Promise<{ display_name: string | null; first_name: string | null; last_name: string | null; phone_whatsapp: string | null } | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from('profiles').select('display_name, first_name, last_name, phone_whatsapp').eq('id', id).maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

export async function signOutAccount(): Promise<void> {
  try {
    await supabase?.auth.signOut();
  } catch {
    // igual borramos la sesión local
  }
}

/** Guarda el DNI en el servidor (solo el hash). Devuelve los últimos 4 dígitos. */
export async function saveDni(dni: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('save_my_dni', { p_dni: dni });
  if (error || typeof data !== 'string') return null;
  return data;
}

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

export type AuthResult = { id: string } | { error: string };

function authError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ese correo ya tiene cuenta. Entra con tu contraseña.';
  if (m.includes('email not confirmed')) return 'Falta confirmar el correo. En Supabase, desactiva “Confirm email” para la demo.';
  if (m.includes('password')) return 'La contraseña debe tener al menos 8 caracteres.';
  if (m.includes('network') || m.includes('fetch')) return 'Sin conexión. Puedes entrar solo en este celular.';
  return 'No pudimos entrar. Revisa el correo y la contraseña.';
}

/** Crea la cuenta o entra. Hace falta internet. */
export async function signInWithEmail(email: string, password: string, mode: 'signup' | 'login'): Promise<AuthResult> {
  if (!supabase) return { error: 'Falta configurar Supabase en este celular.' };
  try {
    if (mode === 'signup') {
      const created = await supabase.auth.signUp({ email: email.trim(), password });
      if (created.error) return { error: authError(created.error.message) };
      if (created.data.session?.user.id) return { id: created.data.session.user.id };
      const signed = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signed.error) return { error: authError(signed.error.message) };
      if (!signed.data.user) return { error: 'No pudimos crear la cuenta.' };
      return { id: signed.data.user.id };
    }
    const signed = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signed.error) return { error: authError(signed.error.message) };
    if (!signed.data.user) return { error: 'No pudimos entrar.' };
    return { id: signed.data.user.id };
  } catch {
    return { error: 'Sin conexión. Puedes entrar solo en este celular.' };
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

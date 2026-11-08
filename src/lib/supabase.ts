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

/**
 * Garantiza una sesión anónima. Si no hay internet o Supabase no está configurado,
 * devuelve null sin lanzar error: la app trabaja con SQLite y sincroniza después.
 */
export async function ensureAnonSession(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session.user.id;
    const { data: signIn, error } = await supabase.auth.signInAnonymously();
    if (error) return null;
    return signIn.user?.id ?? null;
  } catch {
    return null;
  }
}

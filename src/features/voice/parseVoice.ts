import { parseVoiceOffline, type ParsedPost } from '@/features/voice/parseVoiceOffline';
import { useConnectivity } from '@/lib/connectivity';
import { supabase } from '@/lib/supabase';

const TIMEOUT_MS = 4000;

/**
 * Online: Edge Function `parse-voice` (LLM, la API key vive solo en Supabase).
 * Si no hay internet, tarda más de 4 s, falla o se agota la cuota → parser offline, sin mostrar error.
 */
export async function parseVoice(text: string): Promise<ParsedPost & { source: 'llm' | 'offline' }> {
  const offline = parseVoiceOffline(text);
  if (!supabase || !useConnectivity.getState().isOnline) return { ...offline, source: 'offline' };
  try {
    const call = supabase.functions.invoke<ParsedPost>('parse-voice', { body: { text } });
    const res = await Promise.race([call, new Promise<null>((r) => setTimeout(() => r(null), TIMEOUT_MS))]);
    const data = res?.data;
    if (!res || res.error || !data || !data.module || !data.title) return { ...offline, source: 'offline' };
    // El LLM manda; lo que no reconozca lo completa el parser offline
    return {
      ...offline,
      ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== '')),
      source: 'llm',
    } as ParsedPost & { source: 'llm' };
  } catch {
    return { ...offline, source: 'offline' };
  }
}

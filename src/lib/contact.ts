import { Alert, Linking } from 'react-native';
import type { LatLng } from '@/lib/geo';
import { supabase } from '@/lib/supabase';

const DEMO_WHATSAPP = process.env.EXPO_PUBLIC_DEMO_WHATSAPP;

/** Normaliza a formato internacional peruano (51 + 9 dígitos). */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) return `51${digits}`;
  if (digits.length >= 11) return digits;
  return null;
}

/** Teléfono de un servicio aprobado. No está en el listado: se pide al tocarlo. */
export async function revealListingPhone(listingId: string, local: string | null | undefined): Promise<string | null> {
  if (local) return local;
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('contact_listing', { p_id: listingId });
  if (error || typeof data !== 'string') return null;
  return data;
}

/** Ubicación y teléfono de una oferta ya aceptada, solo para las dos personas. */
export async function revealAcceptedOffer(responseId: string): Promise<{ lat: number; lng: number; phone: string | null } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('contact_response', { p_id: responseId });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row || typeof row.lat !== 'number') return null;
  return { lat: row.lat, lng: row.lng, phone: typeof row.phone === 'string' ? row.phone : null };
}

/**
 * Abre WhatsApp con mensaje prellenado (https://wa.me/51XXXXXXXXX?text=…).
 * Sin número (datos demo o vecino que no dejó su WhatsApp) usa EXPO_PUBLIC_DEMO_WHATSAPP;
 * si tampoco hay, WhatsApp abre con el mensaje listo para elegir el contacto.
 */
export async function openWhatsApp(phone: string | null | undefined, message: string) {
  const num = normalizePhone(phone) ?? normalizePhone(DEMO_WHATSAPP);
  const text = encodeURIComponent(message);
  const url = num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('No pudimos abrir WhatsApp', 'Revisa que WhatsApp esté instalado o inténtalo de nuevo con señal.');
  }
}

export function mapsLink(p: LatLng): string {
  return `https://maps.google.com/?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
}

/** Plan B del SOS: abre la app de SMS con texto y ubicación prellenados. */
export async function openSms(body: string, phone = '') {
  await Linking.openURL(`sms:${phone}?body=${encodeURIComponent(body)}`);
}

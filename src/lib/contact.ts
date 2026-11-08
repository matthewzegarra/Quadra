import { Linking } from 'react-native';
import type { LatLng } from '@/lib/geo';

const DEMO_WHATSAPP = process.env.EXPO_PUBLIC_DEMO_WHATSAPP;

/** Normaliza a formato internacional peruano (51 + 9 dígitos). */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) return `51${digits}`;
  if (digits.length >= 11) return digits;
  return null;
}

/**
 * Abre WhatsApp con mensaje prellenado. Sin número (datos demo sin teléfonos reales)
 * usa EXPO_PUBLIC_DEMO_WHATSAPP o abre WhatsApp para elegir el contacto.
 */
export async function openWhatsApp(phone: string | null | undefined, message: string) {
  const num = normalizePhone(phone) ?? normalizePhone(DEMO_WHATSAPP);
  const text = encodeURIComponent(message);
  const url = num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`;
  await Linking.openURL(url);
}

export function mapsLink(p: LatLng): string {
  return `https://maps.google.com/?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
}

/** Plan B del SOS: abre la app de SMS con texto y ubicación prellenados. */
export async function openSms(body: string, phone = '') {
  await Linking.openURL(`sms:${phone}?body=${encodeURIComponent(body)}`);
}

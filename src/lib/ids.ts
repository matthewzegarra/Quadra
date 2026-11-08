import * as Crypto from 'expo-crypto';

/** UUID v4 generado en el cliente: permite crear registros sin conexión. */
export function newId(): string {
  return Crypto.randomUUID();
}

/** Marca de tiempo ISO para created_at / updated_at locales. */
export function nowIso(): string {
  return new Date().toISOString();
}

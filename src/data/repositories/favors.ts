import { getDb } from '@/data/db';
import { patchRow, saveRow } from '@/data/repositories/base';
import type { Favor, FavorResponse, FavorType, MobilityRole, Profile } from '@/data/types';
import { useLocalQuery } from '@/data/useLocalQuery';
import { currentUserId, currentUserName } from '@/features/session/store';
import { distanceMeters, type LatLng } from '@/lib/geo';
import { located, reviewForNewPost, sharePoint } from '@/lib/privacy';
import { newId } from '@/lib/ids';
import { DEMO_ZONE_ID } from '@/lib/zone';

export const THANKS_MESSAGE = '¡Gracias, vecino! Esta vez ya me ayudaron, pero tu intención cuenta.';

export type FavorWithMeta = Favor & { author_name: string | null; offers: number; distance_m: number; my_response_status: string | null };

export function useFavors(opts: { from: LatLng; type: FavorType | null }) {
  const { from, type } = opts;
  return useLocalQuery<FavorWithMeta[]>(
    ['favors', 'favor_responses', 'profiles'],
    async (db) => {
      const rows = await db.getAllAsync<Favor & { author_name: string | null; offers: number; my_response_status: string | null }>(
        `SELECT f.*, p.display_name AS author_name,
           (SELECT COUNT(*) FROM favor_responses r WHERE r.favor_id = f.id AND r.status <> 'retirado') AS offers,
           (SELECT r2.status FROM favor_responses r2 WHERE r2.favor_id = f.id AND r2.responder_id = ?) AS my_response_status
         FROM favors f LEFT JOIN profiles p ON p.id = f.author_id
         WHERE f.status <> 'resuelto'
           AND (coalesce(f.review_status, 'aprobado') = 'aprobado' OR (f.author_id = ? AND f.review_status = 'pendiente'))
           ${type ? 'AND f.type = ?' : ''}
         ORDER BY f.created_at DESC`,
        type ? [currentUserId(), currentUserId(), type] : [currentUserId(), currentUserId()],
      );
      return rows.map((r) => ({ ...r, distance_m: distanceMeters(from, sharePoint(r, r.author_id === currentUserId())) }));
    },
    [from.lat, from.lng, type],
  );
}

export type OfferWithMeta = FavorResponse & { aynis: number | null; phone: string | null };

export type FavorDetail = { favor: Favor; author: Profile | null; offers: OfferWithMeta[]; mine: FavorResponse | null };

export function useFavor(id: string) {
  return useLocalQuery<FavorDetail | null>(
    ['favors', 'favor_responses', 'profiles'],
    async (db) => {
      const favor = await db.getFirstAsync<Favor>('SELECT * FROM favors WHERE id = ?', [id]);
      if (!favor) return null;
      const author = favor.author_id ? await db.getFirstAsync<Profile>('SELECT * FROM profiles WHERE id = ?', [favor.author_id]) : null;
      const offers = await db.getAllAsync<OfferWithMeta>(
        `SELECT r.*, p.aynis AS aynis, p.phone_whatsapp AS phone FROM favor_responses r
         LEFT JOIN profiles p ON p.id = r.responder_id
         WHERE r.favor_id = ? AND r.status <> 'retirado' ORDER BY r.distance_m ASC`,
        [id],
      );
      const mine = await db.getFirstAsync<FavorResponse>('SELECT * FROM favor_responses WHERE favor_id = ? AND responder_id = ?', [
        id,
        currentUserId(),
      ]);
      return { favor, author, offers, mine };
    },
    [id],
  );
}

export type NewFavor = {
  type: FavorType;
  category: string;
  title: string;
  description?: string | null;
  location: LatLng;
  mobility?: { destination: string; days: string[]; time: string; role: MobilityRole };
};

export async function createFavor(input: NewFavor): Promise<string> {
  const id = newId();
  await saveRow('favors', {
    id,
    author_id: currentUserId(),
    zone_id: DEMO_ZONE_ID,
    type: input.type,
    category: input.category,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    ...located(input.location),
    status: 'abierto',
    review_status: reviewForNewPost(),
    accepted_response_id: null,
    mobility_destination: input.mobility?.destination.trim() ?? null,
    mobility_days: input.mobility ? JSON.stringify(input.mobility.days) : null,
    mobility_time: input.mobility?.time ?? null,
    mobility_role: input.mobility?.role ?? null,
  });
  return id;
}

/** "Yo te ayudo": crea la oferta (offline primero, sale por la outbox). */
export async function offerHelp(
  favor: Favor,
  input: { location: LatLng; source: 'gps' | 'mapa'; label: string | null; message: string },
): Promise<void> {
  const db = await getDb();
  const prev = await db.getFirstAsync<FavorResponse>('SELECT * FROM favor_responses WHERE favor_id = ? AND responder_id = ?', [
    favor.id,
    currentUserId(),
  ]);
  await saveRow('favor_responses', {
    id: prev?.id ?? newId(),
    favor_id: favor.id,
    responder_id: currentUserId(),
    responder_name: currentUserName(),
    message: input.message.trim() || null,
    ...located(input.location),
    location_source: input.source,
    location_label: input.label,
    distance_m: distanceMeters(input.location, favor),
    status: 'propuesto',
    thanks_message: null,
    ...(prev ? { created_at: prev.created_at } : {}),
  });
}

export async function withdrawOffer(responseId: string) {
  await patchRow('favor_responses', responseId, { status: 'retirado' });
}

/** Elegir quién te ayuda: la elegida pasa a "aceptado", las demás a "agradecido" con mensaje automático. */
export async function acceptOffer(favor: Favor, chosen: FavorResponse, all: FavorResponse[]) {
  await patchRow('favor_responses', chosen.id, { status: 'aceptado' });
  for (const o of all) {
    if (o.id !== chosen.id && o.status === 'propuesto') {
      await patchRow('favor_responses', o.id, { status: 'agradecido', thanks_message: THANKS_MESSAGE });
    }
  }
  await patchRow('favors', favor.id, { status: 'en_curso', accepted_response_id: chosen.id });
}

/** "Ya me ayudaron": favor resuelto y +5 Quadri Points para quien ayudó (trigger del servidor). */
export async function resolveFavor(favor: Favor) {
  if (favor.accepted_response_id) await patchRow('favor_responses', favor.accepted_response_id, { status: 'completado' });
  await patchRow('favors', favor.id, { status: 'resuelto' });
}

function minutesOf(t: string | null): number | null {
  const m = t?.match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
const normPlace = (s: string | null) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(colegio|cole|ie|i\.e\.|escuela|nido)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Coincidencias de movilidad solidaria: mismo destino y hora ±30 min. */
export function useMobilityMatches(favor: Favor | null | undefined) {
  return useLocalQuery<(Favor & { author_name: string | null })[]>(
    ['favors', 'profiles'],
    async (db) => {
      if (!favor || favor.type !== 'movilidad') return [];
      const others = await db.getAllAsync<Favor & { author_name: string | null }>(
        `SELECT f.*, p.display_name AS author_name FROM favors f LEFT JOIN profiles p ON p.id = f.author_id
         WHERE f.type = 'movilidad' AND f.id <> ? AND f.status <> 'resuelto'`,
        [favor.id],
      );
      const place = normPlace(favor.mobility_destination);
      const t = minutesOf(favor.mobility_time);
      return others.filter((o) => {
        if (!place || normPlace(o.mobility_destination) !== place) return false;
        const ot = minutesOf(o.mobility_time);
        return t === null || ot === null || Math.abs(t - ot) <= 30;
      });
    },
    [favor?.id, favor?.mobility_destination, favor?.mobility_time],
  );
}

/** Para el muro: ¿esta movilidad coincide con alguna mía? */
export function useMyMobility() {
  return useLocalQuery<Favor[]>(['favors'], (db) =>
    db.getAllAsync<Favor>(`SELECT * FROM favors WHERE type = 'movilidad' AND author_id = ? AND status <> 'resuelto'`, [currentUserId()]),
  );
}

export function mobilityMatches(a: Favor, b: Favor): boolean {
  if (normPlace(a.mobility_destination) !== normPlace(b.mobility_destination) || !normPlace(a.mobility_destination)) return false;
  const ta = minutesOf(a.mobility_time);
  const tb = minutesOf(b.mobility_time);
  return ta === null || tb === null || Math.abs(ta - tb) <= 30;
}

export function useMyFavors() {
  return useLocalQuery<Favor[]>(['favors'], (db) =>
    db.getAllAsync<Favor>('SELECT * FROM favors WHERE author_id = ? ORDER BY created_at DESC', [currentUserId()]),
  );
}

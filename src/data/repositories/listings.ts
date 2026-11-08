import { getDb } from '@/data/db';
import { putLocal, saveRow } from '@/data/repositories/base';
import { ensureMyProfile } from '@/data/repositories/profiles';
import { bumpTables } from '@/data/store';
import type { Listing, ListingKind, Profile, VistoBueno } from '@/data/types';
import { useLocalQuery } from '@/data/useLocalQuery';
import { currentUserId } from '@/features/session/store';
import { distanceMeters, WALKING_RADIUS_M, type LatLng } from '@/lib/geo';
import { located, reviewForNewPost, sharePoint } from '@/lib/privacy';
import { newId } from '@/lib/ids';
import { DEMO_ZONE_ID } from '@/lib/zone';

export type ListingWithMeta = Listing & { owner_name: string | null; distance_m: number };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Servicios y productos ordenados por distancia (filtro "A pie" ≤ 1.5 km por defecto). */
export function useNearbyListings(opts: { from: LatLng; category: string | null; walkOnly: boolean; search: string; emergencyOnly?: boolean }) {
  const { from, category, walkOnly, search, emergencyOnly } = opts;
  return useLocalQuery<ListingWithMeta[]>(
    ['listings', 'profiles'],
    async (db) => {
      const rows = await db.getAllAsync<Listing & { owner_name: string | null }>(
        `SELECT l.*, p.display_name AS owner_name FROM listings l
         LEFT JOIN profiles p ON p.id = l.owner_id
         WHERE l.is_active = 1
           AND (coalesce(l.review_status, 'aprobado') = 'aprobado' OR (l.owner_id = ? AND l.review_status = 'pendiente'))
           ${category ? 'AND l.category = ?' : ''} ${emergencyOnly ? 'AND l.available_in_emergency = 1' : ''}`,
        category ? [currentUserId(), category] : [currentUserId()],
      );
      const q = norm(search.trim());
      return rows
        .map((r) => ({ ...r, distance_m: distanceMeters(from, sharePoint(r, r.owner_id === currentUserId())) }))
        .filter((r) => !walkOnly || r.distance_m <= WALKING_RADIUS_M)
        .filter((r) => !q || norm(`${r.title} ${r.description ?? ''} ${r.category} ${r.owner_name ?? ''}`).includes(q))
        .sort((a, b) => a.distance_m - b.distance_m);
    },
    [from.lat, from.lng, category, walkOnly, search, emergencyOnly],
  );
}

export type ListingDetail = {
  listing: Listing;
  owner: Profile | null;
  voters: { name: string; comment: string | null; distance_m: number }[];
  myVote: VistoBueno | null;
};

export function useListing(id: string) {
  return useLocalQuery<ListingDetail | null>(
    ['listings', 'vistos_buenos', 'profiles'],
    async (db) => {
      const listing = await db.getFirstAsync<Listing>('SELECT * FROM listings WHERE id = ?', [id]);
      if (!listing) return null;
      const owner = listing.owner_id
        ? await db.getFirstAsync<Profile>('SELECT * FROM profiles WHERE id = ?', [listing.owner_id])
        : null;
      const voters = await db.getAllAsync<{ name: string; comment: string | null; distance_m: number }>(
        `SELECT COALESCE(p.display_name, 'Vecino') AS name, v.comment, v.distance_m FROM vistos_buenos v
         LEFT JOIN profiles p ON p.id = v.voter_id WHERE v.listing_id = ? ORDER BY v.created_at DESC`,
        [id],
      );
      const myVote = await db.getFirstAsync<VistoBueno>('SELECT * FROM vistos_buenos WHERE listing_id = ? AND voter_id = ?', [
        id,
        currentUserId(),
      ]);
      return { listing, owner, voters, myVote };
    },
    [id],
  );
}

export type NewListing = {
  kind: ListingKind;
  category: string;
  title: string;
  description?: string | null;
  price_hint?: string | null;
  schedule?: string | null;
  location: LatLng;
  whatsapp?: string | null;
  available_in_emergency?: boolean;
  emergency_capability?: string | null;
};

export async function createListing(input: NewListing): Promise<string> {
  const id = newId();
  await saveRow('listings', {
    id,
    owner_id: currentUserId(),
    zone_id: DEMO_ZONE_ID,
    kind: input.kind,
    category: input.category,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    price_hint: input.price_hint?.trim() || null,
    schedule: input.schedule?.trim() || null,
    ...located(input.location),
    review_status: reviewForNewPost(),
    whatsapp: input.whatsapp ?? null,
    available_in_emergency: input.available_in_emergency ? 1 : 0,
    emergency_capability: input.emergency_capability ?? null,
    visto_bueno_count: 0,
    is_active: 1,
  });
  return id;
}

/** Regla del Visto Bueno Vecinal (también la valida el servidor con PostGIS). */
export type VistoBuenoCheck = { ok: true; distance_m: number } | { ok: false; reason: string };

export async function checkVistoBueno(listing: Listing): Promise<VistoBuenoCheck> {
  const me = await ensureMyProfile();
  if (listing.owner_id === me.id) return { ok: false, reason: 'No puedes dar Visto Bueno a tu propia publicación.' };
  if (me.home_lat == null || me.home_lng == null) return { ok: false, reason: 'Primero confirma la ubicación de tu casa en tu Perfil.' };
  const db = await getDb();
  const existing = await db.getFirstAsync('SELECT id FROM vistos_buenos WHERE listing_id = ? AND voter_id = ?', [listing.id, me.id]);
  if (existing) return { ok: false, reason: 'Ya le diste tu Visto Bueno. ¡Gracias!' };
  const d = distanceMeters({ lat: me.home_lat, lng: me.home_lng }, listing);
  if (d > WALKING_RADIUS_M) return { ok: false, reason: `Vives a ${(d / 1000).toFixed(1)} km. Solo vecinos a menos de 1.5 km pueden dar Visto Bueno.` };
  return { ok: true, distance_m: d };
}

export async function giveVistoBueno(listing: Listing, comment: string | null): Promise<VistoBuenoCheck> {
  const check = await checkVistoBueno(listing);
  if (!check.ok) return check;
  await saveRow(
    'vistos_buenos',
    { id: newId(), listing_id: listing.id, voter_id: currentUserId(), comment: comment?.trim() || null, distance_m: check.distance_m },
    'insert',
  );
  // Contador local inmediato; el servidor lo recalcula con su trigger y llega en el próximo pull.
  await putLocal('listings', { ...listing, visto_bueno_count: listing.visto_bueno_count + 1 });
  bumpTables('listings');
  return check;
}

export function useMyListings() {
  return useLocalQuery<Listing[]>(['listings'], (db) =>
    db.getAllAsync<Listing>('SELECT * FROM listings WHERE owner_id = ? ORDER BY created_at DESC', [currentUserId()]),
  );
}

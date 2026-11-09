import { getDb } from '@/data/db';
import { patchRow, putLocal } from '@/data/repositories/base';
import type { ReviewStatus } from '@/data/types';
import { useLocalQuery } from '@/data/useLocalQuery';
import { currentUserId } from '@/features/session/store';
import { nowIso, newId } from '@/lib/ids';

export type PendingItem = {
  id: string;
  entity: 'listing' | 'favor' | 'emergency_report';
  table: 'listings' | 'favors' | 'emergency_reports';
  title: string;
  detail: string;
};

/** Cola de la junta: lo que todavía no se muestra en el mapa de la zona. */
export function usePendingReviews() {
  return useLocalQuery<PendingItem[]>(['listings', 'favors', 'emergency_reports'], async (db) => {
    const listings = await db.getAllAsync<{ id: string; title: string; category: string }>(
      `SELECT id, title, category FROM listings WHERE review_status = 'pendiente' ORDER BY created_at DESC`,
    );
    const favors = await db.getAllAsync<{ id: string; title: string; type: string }>(
      `SELECT id, title, type FROM favors WHERE review_status = 'pendiente' ORDER BY created_at DESC`,
    );
    const reports = await db.getAllAsync<{ id: string; description: string | null; kind: string; author_name: string | null }>(
      `SELECT id, description, kind, author_name FROM emergency_reports WHERE review_status = 'pendiente' ORDER BY created_at DESC`,
    );
    return [
      ...listings.map((r) => ({ id: r.id, entity: 'listing' as const, table: 'listings' as const, title: r.title, detail: r.category })),
      ...favors.map((r) => ({ id: r.id, entity: 'favor' as const, table: 'favors' as const, title: r.title, detail: r.type })),
      ...reports.map((r) => ({
        id: r.id,
        entity: 'emergency_report' as const,
        table: 'emergency_reports' as const,
        title: r.description || r.kind,
        detail: r.author_name ?? 'Emergencia',
      })),
    ];
  });
}

export type PublishedEmergency = PendingItem & { kind: string; created_at: string; origin: string };

/** Avisos de emergencia ya publicados (salen al instante): la junta puede ocultar los falsos. */
export function useRecentEmergency() {
  return useLocalQuery<PublishedEmergency[]>(['emergency_reports'], async (db) => {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const rows = await db.getAllAsync<{ id: string; description: string | null; kind: string; author_name: string | null; created_at: string; origin: string }>(
      `SELECT id, description, kind, author_name, created_at, origin FROM emergency_reports
       WHERE coalesce(review_status, 'aprobado') = 'aprobado' AND kind <> 'estoy_bien'
         AND (author_id IS NULL OR author_id <> ?) AND created_at >= ?
       ORDER BY created_at DESC LIMIT 30`,
      [currentUserId(), since],
    );
    return rows.map((r) => ({
      id: r.id,
      entity: 'emergency_report' as const,
      table: 'emergency_reports' as const,
      title: r.description || r.kind,
      detail: r.author_name ?? 'Vecino',
      kind: r.kind,
      created_at: r.created_at,
      origin: r.origin,
    }));
  });
}

export async function moderateItem(item: PendingItem, decision: Extract<ReviewStatus, 'aprobado' | 'rechazado'>, reason: string) {
  const note = reason.trim().slice(0, 200);
  await patchRow(item.table, item.id, { review_status: decision, review_note: note || null });
  await putLocal('moderation_log', {
    id: newId(),
    entity: item.entity,
    entity_id: item.id,
    decision,
    moderator_id: currentUserId(),
    reason: note || null,
    created_at: nowIso(),
  });
}

export async function countPending(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT
       (SELECT COUNT(*) FROM listings WHERE review_status = 'pendiente')
       + (SELECT COUNT(*) FROM favors WHERE review_status = 'pendiente')
       + (SELECT COUNT(*) FROM emergency_reports WHERE review_status = 'pendiente') AS n`,
  );
  return row?.n ?? 0;
}

import type { SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { getDb } from '@/data/db';
import { useDataVersion } from '@/data/store';

/**
 * Lee de SQLite y se vuelve a ejecutar cuando cambian las tablas indicadas o las deps.
 * La UI nunca espera a la red: siempre hay respuesta local.
 */
export function useLocalQuery<T>(
  tables: string[],
  query: (db: SQLiteDatabase) => Promise<T>,
  deps: unknown[] = [],
): { data: T | undefined; loading: boolean } {
  const versionKey = useDataVersion((s) => tables.map((t) => s.versions[t] ?? 0).join('.'));
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    let alive = true;
    getDb()
      .then((db) => queryRef.current(db))
      .then((res) => {
        if (alive) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((e) => {
        console.warn('[useLocalQuery]', e);
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionKey, ...deps]);

  return { data, loading };
}

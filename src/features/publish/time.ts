// Hora de la movilidad solidaria, escrita a mano por el vecino.

/** "7.15", "7 15", "715", "7" o "7:15 pm" → "07:15" / "19:15". Si no se entiende, se deja como lo escribió. */
export function normalizeTime(raw: string): string {
  const t = raw.trim().toLowerCase();
  const m = t.match(/^(\d{1,2})\s*[:.h ]\s*(\d{2})/) ?? t.match(/^(\d{1,2})(\d{2})(?!\d)/) ?? t.match(/^(\d{1,2})(?!\d)/);
  if (!m) return raw.trim();
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (/p\.?\s*m/.test(t) && h < 12) h += 12;
  if (h > 23 || min > 59) return raw.trim();
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

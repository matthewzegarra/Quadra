// Parser de voz sin internet: diccionario de palabras clave → módulo, tipo, categoría, precio y horario.
// Lo usamos siempre como respaldo del LLM (prompt.md §6.4).

export type ParsedPost = {
  module: 'listing' | 'favor' | 'emergency';
  kind?: 'servicio' | 'producto';
  type?: 'pido' | 'ofrezco' | 'presto' | 'dono' | 'intercambio' | 'movilidad';
  category: string;
  title: string;
  description?: string | null;
  price_hint?: string | null;
  schedule?: string | null;
  need?: string | null;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const has = (t: string, words: string[]) => words.some((w) => new RegExp(`\\b${w}`).test(t));

const LISTING_CATS: [string, string[]][] = [
  ['gasfiteria', ['gasfiter', 'gasfiteria', 'cano', 'fuga', 'desague', 'terma', 'plomer']],
  ['electricidad', ['electric', 'luz', 'cortocircuito', 'tablero', 'enchufe']],
  ['cerrajeria', ['cerraj', 'llave', 'chapa', 'cerradura']],
  ['carpinteria', ['carpint', 'mueble', 'madera', 'repisa']],
  ['comida', ['lasana', 'pastel', 'torta', 'comida', 'tamal', 'postre', 'alfajor', 'menu', 'almuerzo', 'pan', 'cocino', 'empanada', 'mermelada', 'queque', 'pollo']],
  ['clases', ['clase', 'ensen', 'matematica', 'ingles', 'tarea', 'curso', 'profe']],
  ['mascotas', ['perro', 'mascota', 'gato', 'pasear', 'paseo']],
  ['salud', ['enfermer', 'inyecc', 'salud', 'presion', 'medic']],
  ['transporte', ['taxi', 'mudanza', 'flete', 'camioneta', 'movilidad']],
];

const FAVOR_CATS: [string, string[]][] = [
  ['herramientas', ['taladro', 'martillo', 'escalera', 'herramienta', 'alicate', 'desarmador']],
  ['salud', ['muleta', 'silla de ruedas', 'medicina', 'andador']],
  ['materiales', ['ropa', 'material', 'cemento', 'pintura', 'libro', 'utiles', 'juguete']],
  ['habilidades', ['ensen', 'aprender', 'excel', 'cocinar', 'clase']],
  ['cuidado', ['cuidar', 'cuidado', 'acompan', 'nino', 'abuel']],
];

const NEED_WORDS: [string, string[]][] = [
  ['agua', ['agua']],
  ['baldes', ['balde', 'inund']],
  ['medicinas', ['medicina', 'remedio', 'insulina', 'pastilla']],
  ['refugio', ['refugio', 'donde dormir', 'techo', 'albergue']],
  ['rescate', ['atrapad', 'rescate', 'herid', 'escombro']],
  ['comida', ['comida', 'alimento', 'hambre']],
  ['abrigo', ['abrigo', 'frazada', 'manta', 'frio']],
  ['energia', ['luz', 'generador', 'cargar', 'bateria', 'energia']],
];

const DAYS: [string, string][] = [
  ['lunes', 'lunes'],
  ['martes', 'martes'],
  ['miercoles', 'miércoles'],
  ['jueves', 'jueves'],
  ['viernes', 'viernes'],
  ['sabado', 'sábados'],
  ['domingo', 'domingos'],
  ['fin de semana', 'fines de semana'],
  ['todos los dias', 'todos los días'],
  ['diario', 'todos los días'],
];

function match(t: string, table: [string, string[]][]): string | null {
  for (const [key, words] of table) if (has(t, words)) return key;
  return null;
}

function extractPrice(t: string): string | null {
  if (has(t, ['gratis', 'sin costo', 'regalo'])) return 'gratis';
  if (/a convenir/.test(t)) return 'a convenir';
  const m = t.match(/(?:s\/\.?\s*|a\s+|por\s+|en\s+)?(\d+(?:[.,]\d+)?)\s*(?:soles|sol|lucas|cocos|s\/)/) ?? t.match(/s\/\.?\s*(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const amount = `S/ ${m[1].replace(',', '.')}`;
  return /desde\s+(s\/\.?\s*)?\d/.test(t) ? `Desde ${amount}` : amount;
}

function extractSchedule(t: string): string | null {
  const parts: string[] = [];
  for (const [w, label] of DAYS) if (t.includes(w)) parts.push(label);
  const time = t.match(/(?:a las|desde las)\s+(\d{1,2}(?::\d{2})?)\s*(am|pm|de la manana|de la tarde|de la noche)?/);
  if (/en la manana|por la manana/.test(t)) parts.push('en la mañana');
  if (/en la tarde|por la tarde/.test(t)) parts.push('en la tarde');
  if (time) parts.push(`${time[1]}${time[2] ? ' ' + time[2].replace('de la manana', 'am').replace('de la tarde', 'pm').replace('de la noche', 'pm') : ''}`);
  if (!parts.length) return null;
  const s = [...new Set(parts)].join(', ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function capitalize(s: string) {
  const t = s.trim().replace(/\s+/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Construye un título corto a partir del texto dictado. */
function makeTitle(raw: string): string {
  let s = raw
    .replace(/\b(a|por|en|desde)\s+\d+(?:[.,]\d+)?\s*(soles|sol|lucas)\b.*$/i, '')
    .replace(/\b(los|todos los)\s+(lunes|martes|miércoles|miercoles|jueves|viernes|sábados|sabados|domingos)\b.*$/i, '')
    .trim();
  if (s.length > 60) s = s.slice(0, 57).trimEnd() + '…';
  return capitalize(s || raw);
}

export function parseVoiceOffline(text: string): ParsedPost {
  const t = norm(text);
  const price_hint = extractPrice(t);
  const schedule = extractSchedule(t);
  const description = capitalize(text);

  // Emergencia
  if (has(t, ['socorro', 'auxilio', 'emergencia', 'sos', 'ayuda urgente', 'atrapad', 'inund', 'herid', 'sismo', 'temblor', 'incendio'])) {
    const need = match(t, NEED_WORDS) ?? 'rescate';
    return { module: 'emergency', category: need, need, title: makeTitle(text), description };
  }

  // Movilidad solidaria
  if (has(t, ['colegio', 'llevo a', 'recojo', 'jalo', 'movilidad', 'carpool', 'nido'])) {
    return { module: 'favor', type: 'movilidad', category: 'movilidad', title: makeTitle(text), description, schedule };
  }

  // Préstamos y donaciones
  if (has(t, ['me prestan', 'alguien me preste', 'necesito que me presten', 'quien me presta'])) {
    return { module: 'favor', type: 'pido', category: match(t, FAVOR_CATS) ?? 'otros', title: makeTitle(text), description };
  }
  if (has(t, ['presto', 'prestar'])) {
    return { module: 'favor', type: 'presto', category: match(t, FAVOR_CATS) ?? 'herramientas', title: makeTitle(text), description };
  }
  if (has(t, ['dono', 'regalo', 'donar', 'regalar'])) {
    return { module: 'favor', type: 'dono', category: match(t, FAVOR_CATS) ?? 'materiales', title: makeTitle(text), description };
  }
  if (has(t, ['intercambio', 'cambio', 'te enseno', 'a cambio'])) {
    return { module: 'favor', type: 'intercambio', category: 'habilidades', title: makeTitle(text), description };
  }
  if (has(t, ['necesito', 'busco', 'pido', 'ayuda', 'alguien que', 'quien tenga', 'una mano'])) {
    // "Busco gasfitero" sigue siendo pedido de ayuda en la Cadena de Favores
    return { module: 'favor', type: 'pido', category: match(t, FAVOR_CATS) ?? 'otros', title: makeTitle(text), description };
  }

  // Servicios y productos (Módulo 1)
  const isProduct = has(t, ['vendo', 'venta', 'preparo', 'hago']) && match(t, LISTING_CATS) === 'comida';
  const category = match(t, LISTING_CATS) ?? 'otros';
  return {
    module: 'listing',
    kind: isProduct || has(t, ['vendo', 'venta']) ? 'producto' : 'servicio',
    category,
    title: makeTitle(text.replace(/^(vendo|ofrezco|hago|preparo)\s+/i, (m) => m)),
    description,
    price_hint,
    schedule,
  };
}

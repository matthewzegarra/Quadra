// Edge Function: convierte lo que el vecino dictó en una publicación estructurada.
// Proveedor intercambiable con el secret LLM_PROVIDER=gemini|claude (por defecto gemini).
// Las API keys viven solo en los secrets de Supabase, nunca en la app.

type ParsedPost = {
  module: 'listing' | 'favor' | 'emergency';
  kind?: 'servicio' | 'producto' | null;
  type?: 'pido' | 'ofrezco' | 'presto' | 'dono' | 'intercambio' | 'movilidad' | null;
  category: string;
  title: string;
  description?: string | null;
  price_hint?: string | null;
  schedule?: string | null;
  need?: string | null;
};

const SYSTEM = `Eres el asistente de "Quadra", una app vecinal de Lima, Perú. Conviertes lo que un vecino dice por voz
en una publicación. Responde SOLO un objeto JSON con estas claves:
module: "listing" (vende un producto u ofrece un servicio pagado), "favor" (pide/presta/dona/intercambia/movilidad, sin dinero) o "emergency" (socorro, sismo, inundación, heridos).
kind: "servicio" | "producto" (solo si module=listing).
type: "pido" | "ofrezco" | "presto" | "dono" | "intercambio" | "movilidad" (solo si module=favor).
category: listing → gasfiteria, carpinteria, electricidad, cerrajeria, mascotas, clases, comida, salud, transporte, otros.
          favor → herramientas, salud, materiales, habilidades, cuidado, movilidad, otros.
          emergency → igual que need.
title: título corto y claro en español (máx. 60 caracteres), en primera persona si es un pedido.
description: el texto original corregido (ortografía y puntuación).
price_hint: "S/ 15", "a convenir", "gratis" o null.
schedule: horario en palabras ("Sábados en la mañana") o null.
need: solo en emergency → agua, baldes, medicinas, refugio, rescate, comida, abrigo, energia.
Entiende jerga peruana: "gasfitero" = plomero, "chamba" = trabajo, "a 15 soles"/"15 lucas" = S/ 15, "jalar" = llevar en auto.`;

const EXAMPLES: [string, ParsedPost][] = [
  ['vendo lasañas a 15 soles los sábados', { module: 'listing', kind: 'producto', category: 'comida', title: 'Lasañas caseras', description: 'Vendo lasañas a 15 soles los sábados.', price_hint: 'S/ 15', schedule: 'Sábados', need: null }],
  ['soy gasfitero busco chamba arreglo fugas y caños desde 40 soles', { module: 'listing', kind: 'servicio', category: 'gasfiteria', title: 'Gasfitero: fugas y caños', description: 'Soy gasfitero, busco chamba. Arreglo fugas y caños desde 40 soles.', price_hint: 'Desde S/ 40', schedule: null, need: null }],
  ['necesito que alguien me preste unas muletas por dos semanas', { module: 'favor', type: 'pido', category: 'salud', title: 'Necesito muletas prestadas por 2 semanas', description: 'Necesito que alguien me preste unas muletas por dos semanas.', price_hint: null, schedule: null, need: null }],
  ['presto mi taladro hoy hasta las seis', { module: 'favor', type: 'presto', category: 'herramientas', title: 'Presto mi taladro', description: 'Presto mi taladro hoy hasta las seis.', price_hint: 'gratis', schedule: 'Hoy hasta las 6 pm', need: null }],
  ['llevo a mi hija al colegio san antonio a las siete y cuarto puedo jalar a otro niño', { module: 'favor', type: 'movilidad', category: 'movilidad', title: 'Llevo al Colegio San Antonio a las 7:15', description: 'Llevo a mi hija al Colegio San Antonio a las 7:15, puedo llevar a otro niño.', price_hint: null, schedule: 'Lun a vie · 7:15', need: null }],
  ['socorro se inunda mi casa necesito baldes somos cuatro', { module: 'emergency', category: 'baldes', title: 'Casa inundada · necesito baldes', description: 'Se inunda mi casa, necesito baldes. Somos cuatro.', price_hint: null, schedule: null, need: 'baldes' }],
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function validate(raw: unknown): ParsedPost | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!['listing', 'favor', 'emergency'].includes(o.module as string)) return null;
  if (typeof o.title !== 'string' || !o.title.trim()) return null;
  return {
    module: o.module as ParsedPost['module'],
    kind: o.kind === 'servicio' || o.kind === 'producto' ? o.kind : null,
    type: ['pido', 'ofrezco', 'presto', 'dono', 'intercambio', 'movilidad'].includes(o.type as string) ? (o.type as ParsedPost['type']) : null,
    category: typeof o.category === 'string' ? o.category : 'otros',
    title: (o.title as string).slice(0, 80),
    description: typeof o.description === 'string' ? o.description : null,
    price_hint: typeof o.price_hint === 'string' ? o.price_hint : null,
    schedule: typeof o.schedule === 'string' ? o.schedule : null,
    need: typeof o.need === 'string' ? o.need : null,
  };
}

function extractJson(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

async function parseWithGemini(text: string): Promise<ParsedPost | null> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY no configurada');
  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-lite-latest';
  const contents = [
    ...EXAMPLES.flatMap(([q, a]) => [
      { role: 'user', parts: [{ text: q }] },
      { role: 'model', parts: [{ text: JSON.stringify(a) }] },
    ]),
    { role: 'user', parts: [{ text }] },
  ];
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const out = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return validate(extractJson(out));
}

async function parseWithClaude(text: string): Promise<ParsedPost | null> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY no configurada');
  const model = Deno.env.get('CLAUDE_MODEL') ?? 'claude-haiku-5-5';
  const messages = [
    ...EXAMPLES.flatMap(([q, a]) => [
      { role: 'user', content: q },
      { role: 'assistant', content: JSON.stringify(a) },
    ]),
    { role: 'user', content: text },
  ];
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 400, system: SYSTEM, messages }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const data = await res.json();
  const out = data?.content?.find((c: { type: string }) => c.type === 'text')?.text ?? '';
  return validate(extractJson(out));
}

/** Misma interfaz para ambos proveedores. */
async function parseWithLLM(text: string): Promise<ParsedPost | null> {
  const provider = (Deno.env.get('LLM_PROVIDER') ?? 'gemini').toLowerCase();
  return provider === 'claude' ? parseWithClaude(text) : parseWithGemini(text);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { text } = await req.json();
    if (typeof text !== 'string' || !text.trim() || text.length > 600) {
      return new Response(JSON.stringify({ error: 'texto inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const parsed = await parseWithLLM(text.trim());
    if (!parsed) throw new Error('respuesta inválida del LLM');
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    // La app usa su parser offline si esto falla: el vecino nunca ve el error.
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'error' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

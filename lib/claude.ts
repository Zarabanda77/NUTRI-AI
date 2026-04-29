import { GROQ_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY } from './config';
import { AnalysisResult, DayTotals, UserProfile } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function isConfigured(key: string): boolean {
  return !!key && !key.includes('PEGA-TU-KEY') && key.length > 10;
}

// ─── Groq (primario - gratis y rápido) ───────────────────────────────

const GROQ_VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
];
const GROQ_TEXT_MODELS = [
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
];

async function callGroq(model: string, messages: object[]): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 1000 }),
  });
  if (!res.ok) throw new Error(`groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`groq:empty`);
  return content;
}

// ─── OpenRouter (respaldo) ───────────────────────────────────────────

const OR_VISION_MODELS = ['baidu/qianfan-ocr-fast:free', 'google/gemma-4-31b-it:free'];
const OR_TEXT_MODELS = ['minimax/minimax-m2.5:free', 'google/gemma-4-31b-it:free'];

async function callOpenRouter(model: string, messages: object[]): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://nutri-ai.app',
      'X-Title': 'Nutri-AI',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: model.includes('reasoning') ? 8000 : 1500,
    }),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  const content = msg?.content || msg?.reasoning;
  if (!content) throw new Error(`openrouter:empty`);
  return content;
}

// ─── Gemini (último recurso) ─────────────────────────────────────────

async function callGemini(messages: object[], hasImage: boolean): Promise<string> {
  // Convert OpenAI-style messages to Gemini parts
  const userMsg: any = messages[0];
  const parts: any[] = [];
  if (Array.isArray(userMsg.content)) {
    for (const p of userMsg.content) {
      if (p.type === 'text') parts.push({ text: p.text });
      else if (p.type === 'image_url') {
        const data = p.image_url.url.split(',')[1];
        parts.push({ inline_data: { mime_type: 'image/jpeg', data } });
      }
    }
  } else {
    parts.push({ text: userMsg.content });
  }

  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { maxOutputTokens: 1000, temperature: hasImage ? 0.1 : 0.7 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error(`gemini:empty`);
  return content;
}

// ─── Cascada de proveedores ──────────────────────────────────────────

interface Provider {
  name: string;
  available: boolean;
  call: (messages: object[], hasImage: boolean) => Promise<string>;
}

function buildProviders(visionMode: boolean): Provider[] {
  const list: Provider[] = [];

  if (isConfigured(GROQ_API_KEY)) {
    const models = visionMode ? GROQ_VISION_MODELS : GROQ_TEXT_MODELS;
    list.push({
      name: 'Groq',
      available: true,
      call: async (messages) => {
        let lastErr: any;
        for (const m of models) {
          try { return await callGroq(m, messages); }
          catch (e) { lastErr = e; console.log(`Groq ${m} failed:`, String(e).slice(0, 100)); }
        }
        throw lastErr;
      },
    });
  }

  if (isConfigured(OPENROUTER_API_KEY)) {
    const models = visionMode ? OR_VISION_MODELS : OR_TEXT_MODELS;
    list.push({
      name: 'OpenRouter',
      available: true,
      call: async (messages) => {
        let lastErr: any;
        for (const m of models) {
          try { return await callOpenRouter(m, messages); }
          catch (e) { lastErr = e; console.log(`OR ${m} failed:`, String(e).slice(0, 100)); }
        }
        throw lastErr;
      },
    });
  }

  if (isConfigured(GEMINI_API_KEY)) {
    list.push({
      name: 'Gemini',
      available: true,
      call: (messages, hasImage) => callGemini(messages, hasImage),
    });
  }

  return list;
}

async function tryProviders(messages: object[], visionMode: boolean): Promise<string> {
  const providers = buildProviders(visionMode);
  if (providers.length === 0) {
    throw new Error('Sin API keys configuradas. Edita lib/config.ts');
  }
  let lastError: any;
  for (const p of providers) {
    try {
      const result = await p.call(messages, visionMode);
      console.log(`✓ Success: ${p.name}`);
      return result;
    } catch (e) {
      console.log(`✗ ${p.name} failed completely`);
      lastError = e;
    }
  }
  throw lastError ?? new Error('Todos los proveedores fallaron');
}

// ─── API pública ─────────────────────────────────────────────────────

export async function analyzeFood(base64Image: string): Promise<AnalysisResult> {
  const prompt = `Eres un experto nutricionista. Analiza esta foto de comida y responde ÚNICAMENTE con un JSON válido sin texto adicional. Formato exacto:
{"food_name":"nombre en español","grams":0,"calories":0,"protein":0,"carbs":0,"fat":0,"serving_size":"porción estimada","advice":"consejo breve para subir peso muscular","confidence":"high"}
"grams" es el peso total estimado de la porción visible en gramos (entero). Las calorías, proteína, carbos y grasas son los valores TOTALES para esa cantidad de gramos. Si no hay comida: {"error":"No se detectó comida"}`;

  const text = await tryProviders([
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
        { type: 'text', text: prompt },
      ],
    },
  ], true);

  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error('No se pudo leer la respuesta de la IA');

  const parsed = JSON.parse(match[0]);
  if (parsed.error) throw new Error(parsed.error);

  ['calories', 'protein', 'carbs', 'fat', 'grams'].forEach(k => {
    parsed[k] = Math.round(Number(parsed[k]) || 0);
  });
  if (!parsed.grams || parsed.grams < 1) parsed.grams = 100;
  parsed.food_name = parsed.food_name || 'Comida';
  parsed.serving_size = parsed.serving_size || 'Porción estimada';
  parsed.advice = parsed.advice || 'Aporta a tu meta calórica del día.';
  parsed.confidence = parsed.confidence || 'medium';

  return parsed as AnalysisResult;
}

export async function getDailyAdvice(
  totals: DayTotals,
  profile: UserProfile
): Promise<string> {
  const calPct = Math.round((totals.calories / profile.daily_calories) * 100);
  const protPct = Math.round((totals.protein / profile.daily_protein) * 100);
  const remain = profile.daily_calories - totals.calories;

  const prompt = `Eres el nutricionista personal de ${profile.name}, quien quiere subir de peso muscular.

Progreso de hoy:
- Calorías: ${Math.round(totals.calories)} / ${profile.daily_calories} kcal (${calPct}%) — le ${remain > 0 ? `faltan ${Math.round(remain)} kcal` : 'sobrepasó su meta'}
- Proteína: ${Math.round(totals.protein)}g / ${profile.daily_protein}g (${protPct}%)
- Carbohidratos: ${Math.round(totals.carbs)}g / ${profile.daily_carbs}g
- Grasas: ${Math.round(totals.fat)}g / ${profile.daily_fat}g

Escribe un consejo personalizado y motivador de máximo 3 oraciones en español. Si le faltan calorías o proteína, sugiere específicamente qué comer. Si va bien, felicítalo con energía.`;

  return tryProviders([{ role: 'user', content: prompt }], false);
}

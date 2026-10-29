import "server-only";
import { fetchConReintento } from "./red";

const BASE = "https://api.mistral.ai/v1";

function clave(): string {
  const k = process.env.MISTRAL_API_KEY;
  if (!k) throw new Error("Falta MISTRAL_API_KEY en el servidor");
  return k;
}

/** Transcribe audio con Voxtral (mismo esquema que el flujo de Sistema-consulta). */
export async function transcribirVoxtral(audio: Blob, nombre: string): Promise<string> {
  const form = new FormData();
  form.append("file", audio, nombre);
  form.append("model", "voxtral-mini-latest");
  form.append("language", "es");
  const r = await fetchConReintento(`${BASE}/audio/transcriptions`, { method: "POST", headers: { "x-api-key": clave() }, body: form }, { tiempoMs: 20000, intentos: 2 });
  if (!r.ok) throw new Error(`Voxtral respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { text?: string };
  return (j.text ?? "").trim();
}

export async function chatMistral(mensajes: { role: "system" | "user"; content: string }[], json = false): Promise<string> {
  const r = await fetchConReintento(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${clave()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral-small-latest",
      temperature: 0,
      messages: mensajes,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  }, { tiempoMs: 15000, intentos: 2 });
  if (!r.ok) throw new Error(`Mistral respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? "";
}

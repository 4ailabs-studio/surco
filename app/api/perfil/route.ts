import { chatMistral } from "@/lib/mistral";
import { normalizarPerfil } from "@/lib/perfil";
import { municipiosEdomex } from "@/lib/datos";

const SISTEMA = `Extraes datos de lo que dice un productor agrícola del Estado de México.
Devuelve SOLO un objeto JSON con estas claves: cultivo (texto o null), hectareas (número o null), municipio (texto o null),
beneficiarioSader (true, false o null: si dice estar en algún programa de SADER o de la Secretaría de Agricultura, como Producción para el Bienestar), posesionPredio (true, false o null: si tiene papeles de la tierra, propia, ejidal o rentada), edad (número o null).
No inventes: si algo no se dice, usa null.`;

export async function POST(req: Request) {
  try {
    const { texto, pregunta } = (await req.json()) as { texto?: string; pregunta?: string };
    if (!texto || !texto.trim()) return Response.json({ error: "No hay texto que analizar." }, { status: 400 });
    const salida = await chatMistral([{ role: "system", content: SISTEMA }, { role: "user", content: (pregunta ? `Pregunta que se le hizo: ${pregunta.slice(0, 200)}\nRespuesta del productor: ` : "") + texto.slice(0, 2000) }], true);
    let raw: unknown = null;
    try { raw = JSON.parse(salida); } catch { raw = null; }
    return Response.json(normalizarPerfil(raw, municipiosEdomex()));
  } catch (e) {
    return Response.json({ error: "No pude leer tus datos. Llénalos a mano.", detalle: (e as Error).message }, { status: 502 });
  }
}

import { transcribirVoxtral } from "@/lib/mistral";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof Blob) || audio.size < 1000) return Response.json({ error: "No llegó audio. Intenta de nuevo o escribe." }, { status: 400 });
    if (audio.size > 15_000_000) return Response.json({ error: "La grabación es demasiado larga." }, { status: 400 });
    const nombre = audio instanceof File && audio.name ? audio.name : "voz.webm";
    const texto = await transcribirVoxtral(audio, nombre);
    // El audio no se guarda: solo vive en esta petición.
    return Response.json({ texto });
  } catch (e) {
    return Response.json({ error: "No pude transcribir el audio. Escribe tus datos en su lugar.", detalle: (e as Error).message }, { status: 502 });
  }
}

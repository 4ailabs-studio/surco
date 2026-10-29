"use client";

/** Lee un texto en voz alta con la voz del navegador (español de México si existe). */
export function decir(texto: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    const voces = s.getVoices();
    u.voice = voces.find((v) => v.lang === "es-MX") ?? voces.find((v) => v.lang.startsWith("es")) ?? null;
    u.lang = u.voice?.lang ?? "es-MX";
    u.rate = 0.95;
    let listo = false;
    const fin = () => { if (!listo) { listo = true; resolve(); } };
    u.onend = fin;
    u.onerror = fin;
    setTimeout(fin, 9000);
    s.speak(u);
  });
}

export function callar() {
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

export type Grabacion = { detener: () => void; resultado: Promise<string> };

/** Graba y se detiene sola tras ~1.4 s de silencio (máximo 12 s); devuelve el texto transcrito por Voxtral. */
export async function grabarYTranscribir(onNivel?: (n: number) => void): Promise<Grabacion> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const tipo = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
  const trozos: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) trozos.push(e.data); };
  const ctx = new AudioContext();
  const analizador = ctx.createAnalyser();
  analizador.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analizador);
  const buf = new Uint8Array(analizador.fftSize);
  let hablo = false, silencioDesde = 0, raf = 0;
  const inicio = performance.now();
  const vigilar = () => {
    analizador.getByteTimeDomainData(buf);
    let suma = 0;
    for (const v of buf) suma += ((v - 128) / 128) ** 2;
    const rms = Math.sqrt(suma / buf.length);
    onNivel?.(Math.min(1, rms * 8));
    const ahora = performance.now();
    if (rms > 0.035) { hablo = true; silencioDesde = 0; } else if (hablo) { silencioDesde ||= ahora; }
    if ((hablo && silencioDesde && ahora - silencioDesde > 1400) || ahora - inicio > 12000 || (!hablo && ahora - inicio > 7000)) {
      if (rec.state === "recording") rec.stop();
      return;
    }
    raf = requestAnimationFrame(vigilar);
  };
  const resultado = new Promise<string>((resolve, reject) => {
    rec.onstop = async () => {
      cancelAnimationFrame(raf);
      onNivel?.(0);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      if (!hablo) return reject(new Error("No te escuché."));
      try {
        const blob = new Blob(trozos, { type: rec.mimeType || "audio/webm" });
        const form = new FormData();
        form.append("audio", new File([blob], blob.type.includes("mp4") ? "voz.m4a" : "voz.webm", { type: blob.type }));
        const r = await fetch("/api/transcribe", { method: "POST", body: form });
        const j = await r.json();
        if (!r.ok || !j.texto) throw new Error(j.error || "No escuché nada.");
        resolve(j.texto as string);
      } catch (e) { reject(e); }
    };
  });
  rec.start();
  raf = requestAnimationFrame(vigilar);
  return { detener: () => { if (rec.state === "recording") rec.stop(); }, resultado };
}

/** Interpreta un sí o un no dicho en voz. */
export function siONo(texto: string): boolean | null {
  const t = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/\b(no se|quien sabe|no estoy seguro)\b/.test(t)) return null;
  if (/\b(no|nada|tampoco|ninguno|ninguna)\b/.test(t)) return false;
  if (/\b(si|claro|tengo|estoy|correcto|asi es|por supuesto)\b/.test(t)) return true;
  return null;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Perfil } from "@/lib/tipos";

type Clave = "cultivoHa" | "municipio" | "beneficiarioSader" | "posesionPredio" | "edad";
type Pregunta = {
  clave: Clave;
  texto: string;
  ayuda: string;
  rapidas?: [string, Partial<Perfil>][];
  opcional?: boolean;
};

const PREGUNTAS: Pregunta[] = [
  { clave: "cultivoHa", texto: "¿Qué siembras y cuántas hectáreas?", ayuda: "Por ejemplo: “Maíz, tres hectáreas”." },
  { clave: "municipio", texto: "¿En qué municipio está tu parcela?", ayuda: "Por ejemplo: “En Toluca”." },
  { clave: "beneficiarioSader", texto: "¿Estás en algún programa de SADER, como Producción para el Bienestar?", ayuda: "Contesta con tu voz o toca una opción.",
    rapidas: [["Sí", { beneficiarioSader: true }], ["No", { beneficiarioSader: false }], ["No sé", { beneficiarioSader: null }]] },
  { clave: "posesionPredio", texto: "¿Tienes papeles de tu tierra? Puede ser propia, ejidal o rentada.", ayuda: "Contesta con tu voz o toca una opción.",
    rapidas: [["Sí", { posesionPredio: true }], ["No", { posesionPredio: false }], ["No sé", { posesionPredio: null }]] },
  { clave: "edad", texto: "¿Cuántos años tienes?", ayuda: "Es opcional: sirve para saber si te pueden pedir aval.", opcional: true },
];

function contestada(p: Perfil, c: Clave, respondidas: Set<Clave>): boolean {
  if (respondidas.has(c)) return true;
  if (c === "cultivoHa") return p.hectareas !== null;
  if (c === "municipio") return Boolean(p.municipio);
  if (c === "edad") return p.edad !== undefined;
  return p[c] !== null;
}

/** Lee un texto en voz alta con la voz del navegador (español de México si existe). */
function decir(texto: string): Promise<void> {
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
    setTimeout(fin, 9000); // por si el navegador no avisa que terminó
    s.speak(u);
  });
}

type Estado = "lista" | "hablando" | "grabando" | "procesando" | "bien" | "repetir";

export default function GuiaVoz({ perfil, onPerfil }: { perfil: Perfil; onPerfil: (p: Partial<Perfil>) => void }) {
  const [respondidas, setRespondidas] = useState<Set<Clave>>(new Set());
  const [indice, setIndice] = useState(0);
  const [estado, setEstado] = useState<Estado>("lista");
  const [asistente, setAsistente] = useState(false);
  const [eco, setEco] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [escribir, setEscribir] = useState(false);
  const [texto, setTexto] = useState("");
  const [nivel, setNivel] = useState(0);
  const grabador = useRef<MediaRecorder | null>(null);
  const trozos = useRef<Blob[]>([]);
  const ultimaDicha = useRef<number>(-1);
  const intentos = useRef(0);

  const pendientes = PREGUNTAS.filter((q) => !contestada(perfil, q.clave, respondidas));
  const hechas = PREGUNTAS.length - pendientes.length;
  const actual = PREGUNTAS[indice];
  const terminado = pendientes.length === 0;

  useEffect(() => {
    if (estado !== "lista" && estado !== "repetir") return;
    if (actual && contestada(perfil, actual.clave, respondidas)) {
      const sig = PREGUNTAS.findIndex((q) => !contestada(perfil, q.clave, respondidas));
      if (sig >= 0) setIndice(sig);
    }
  }, [perfil, respondidas, actual, estado]);

  function avanzar(conRespondida: Clave) {
    const nuevas = new Set(respondidas);
    nuevas.add(conRespondida);
    setRespondidas(nuevas);
    setEstado("bien");
    intentos.current = 0;
    if (asistente) decir("Entendido.");
    setTimeout(() => {
      const sig = PREGUNTAS.findIndex((q) => !contestada(perfil, q.clave, nuevas) && q.clave !== conRespondida);
      if (sig >= 0) setIndice(sig);
      setEstado("lista");
      setEscribir(false);
      setTexto("");
    }, 1100);
  }

  async function interpretar(respuesta: string, q: Pregunta) {
    setEstado("procesando");
    setEco(respuesta);
    try {
      const r = await fetch("/api/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: respuesta, pregunta: q.texto }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const datos = j.perfil as Partial<Perfil>;
      onPerfil(datos);
      const entendio =
        q.clave === "cultivoHa" ? datos.hectareas !== undefined
        : q.clave === "municipio" ? Boolean(datos.municipio)
        : q.clave === "edad" ? datos.edad !== undefined
        : datos[q.clave] !== undefined;
      if (entendio) { setMensaje(""); avanzar(q.clave); }
      else noEntendi(j.avisos?.[0] ?? "No te entendí bien. ¿Me lo repites?");
    } catch {
      noEntendi("No pude procesar tu respuesta. Intenta de nuevo o escríbela.");
    }
  }

  function noEntendi(m: string) {
    setMensaje(m);
    setEstado("repetir");
    intentos.current += 1;
    if (asistente) {
      if (intentos.current >= 2) { decir("Puedes tocar una opción o escribir tu respuesta."); setEscribir(true); }
      else { ultimaDicha.current = -1; decir(m).then(() => setEstado("lista")); }
    }
  }

  /** Graba y se detiene sola tras ~1.4 s de silencio después de hablar (máximo 12 s). */
  const grabar = useCallback(async (q: Pregunta) => {
    setMensaje("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMensaje("No pude usar el micrófono. Revisa el permiso del navegador, o escribe o toca tu respuesta.");
      setEscribir(true);
      setEstado("repetir");
      return;
    }
    const tipo = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
    trozos.current = [];
    rec.ondataavailable = (e) => e.data.size && trozos.current.push(e.data);

    // Detección de silencio
    const ctx = new AudioContext();
    const fuente = ctx.createMediaStreamSource(stream);
    const analizador = ctx.createAnalyser();
    analizador.fftSize = 1024;
    fuente.connect(analizador);
    const buf = new Uint8Array(analizador.fftSize);
    let hablo = false, silencioDesde = 0, timer = 0;
    const inicio = performance.now();
    const vigilar = () => {
      analizador.getByteTimeDomainData(buf);
      let suma = 0;
      for (const v of buf) suma += ((v - 128) / 128) ** 2;
      const rms = Math.sqrt(suma / buf.length);
      setNivel(Math.min(1, rms * 8));
      const ahora = performance.now();
      if (rms > 0.035) { hablo = true; silencioDesde = 0; }
      else if (hablo) { silencioDesde ||= ahora; }
      if ((hablo && silencioDesde && ahora - silencioDesde > 1400) || ahora - inicio > 12000 || (!hablo && ahora - inicio > 7000)) {
        if (rec.state === "recording") rec.stop();
        return;
      }
      timer = requestAnimationFrame(vigilar);
    };

    rec.onstop = async () => {
      cancelAnimationFrame(timer);
      setNivel(0);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      if (!hablo) { noEntendi("No te escuché. ¿Me lo repites?"); return; }
      const blob = new Blob(trozos.current, { type: rec.mimeType || "audio/webm" });
      setEstado("procesando");
      try {
        const form = new FormData();
        form.append("audio", new File([blob], blob.type.includes("mp4") ? "voz.m4a" : "voz.webm", { type: blob.type }));
        const r = await fetch("/api/transcribe", { method: "POST", body: form });
        const j = await r.json();
        if (!r.ok || !j.texto) throw new Error(j.error || "No escuché nada.");
        await interpretar(j.texto, q);
      } catch (e) {
        noEntendi((e as Error).message + " Intenta de nuevo o escribe tu respuesta.");
      }
    };
    rec.start();
    grabador.current = rec;
    setEstado("grabando");
    timer = requestAnimationFrame(vigilar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asistente, perfil, respondidas]);

  // Modo asistente: lee la pregunta en voz alta y escucha sola.
  useEffect(() => {
    if (!asistente || terminado || estado !== "lista" || !actual) return;
    if (ultimaDicha.current === indice) return;
    ultimaDicha.current = indice;
    setEstado("hablando");
    decir(actual.texto).then(() => grabar(actual));
  }, [asistente, estado, indice, actual, terminado, grabar]);

  useEffect(() => {
    if (asistente && terminado) decir("Listo. Ya tengo los datos de tu parcela. Revísalos y sigue con el paso dos.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminado]);

  function iniciarAsistente() {
    ultimaDicha.current = -1;
    intentos.current = 0;
    setAsistente(true);
    setEstado("lista");
  }

  function detenerAsistente() {
    setAsistente(false);
    window.speechSynthesis?.cancel();
    if (grabador.current?.state === "recording") grabador.current.stop();
  }

  if (terminado) {
    return (
      <div className="guia guia-fin" role="status">
        <div className="guia-barra"><div style={{ width: "100%" }} /></div>
        <strong>¡Listo! Ya tengo los datos de tu parcela.</strong>
        <p>Revísalos abajo y corrige lo que haga falta. Luego sigue con el paso 2.</p>
        <button type="button" className="boton secundario" onClick={() => { setRespondidas(new Set()); setIndice(0); ultimaDicha.current = -1; setAsistente(false); onPerfil({ hectareas: null, municipio: null, beneficiarioSader: null, posesionPredio: null, edad: undefined }); }}>
          Empezar de nuevo
        </button>
      </div>
    );
  }

  const ocupado = estado === "procesando" || estado === "bien" || estado === "hablando";

  return (
    <div className="guia">
      <div className="guia-cabeza">
        <span>Pregunta {Math.min(hechas + 1, PREGUNTAS.length)} de {PREGUNTAS.length}</span>
        <div className="guia-barra" aria-hidden><div style={{ width: `${(hechas / PREGUNTAS.length) * 100}%` }} /></div>
      </div>

      {!asistente ? (
        <div className="asistente-inicio">
          <button type="button" className="boton principal" onClick={iniciarAsistente}>Iniciar asistente de voz</button>
          <span>Te hago las preguntas en voz alta y tú me contestas hablando.</span>
        </div>
      ) : (
        <div className="asistente-activo">
          <span className={`asistente-punto ${estado}`} aria-hidden />
          <span>{estado === "hablando" ? "El asistente está hablando…" : estado === "grabando" ? "Te escucho…" : estado === "procesando" ? "Pensando…" : "Asistente activo"}</span>
          <button type="button" className="enlace" onClick={detenerAsistente}>Detener asistente</button>
        </div>
      )}

      <p className="guia-pregunta" aria-live="polite">{actual.texto}</p>
      <p className="guia-ayuda">{actual.ayuda}</p>

      <div className="guia-centro">
        {estado === "grabando" ? (
          <button type="button" className="mic grabando" onClick={() => grabador.current?.stop()} aria-label="Terminar de hablar"
            style={{ boxShadow: `0 6px 0 #7d1a15, 0 0 0 ${6 + nivel * 18}px rgba(179,38,30,.18)` }}>
            <span>Terminar</span>
          </button>
        ) : (
          <button type="button" className={`mic${estado === "bien" ? " bien" : ""}`} onClick={() => grabar(actual)} disabled={ocupado} aria-label="Hablar">
            <span>{estado === "procesando" ? "Pensando…" : estado === "hablando" ? "…" : estado === "bien" ? "✓" : "Hablar"}</span>
          </button>
        )}
        {actual.rapidas && estado !== "grabando" && (
          <div className="opciones guia-rapidas">
            {actual.rapidas.map(([t, datos]) => (
              <button key={t} type="button" className="opcion" disabled={estado === "procesando" || estado === "bien"}
                onClick={() => { window.speechSynthesis?.cancel(); setEco(t); onPerfil(datos); avanzar(actual.clave); }}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {estado === "grabando" && <p className="guia-escucho">Te escucho… me detengo solo cuando dejes de hablar.</p>}
      {eco && estado !== "grabando" && <p className="guia-eco">Dijiste: “{eco}”</p>}
      {estado === "bien" && <p className="guia-bien">¡Entendido!</p>}
      {mensaje && <p className="voz-mensaje" role="status">{mensaje}</p>}

      <div className="acciones guia-pie">
        {!escribir ? (
          <button type="button" className="enlace" onClick={() => setEscribir(true)}>Prefiero escribir</button>
        ) : (
          <form className="guia-escribir" onSubmit={(e) => { e.preventDefault(); if (texto.trim()) interpretar(texto.trim(), actual); }}>
            <input id="guia-texto" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu respuesta" aria-label="Tu respuesta" />
            <button type="submit" className="boton secundario" disabled={!texto.trim() || estado === "procesando"}>Enviar</button>
          </form>
        )}
        {actual.opcional && <button type="button" className="enlace" onClick={() => avanzar(actual.clave)}>Saltar</button>}
      </div>
      <p className="fuente">Tu voz se envía a Mistral (Voxtral) solo para convertirla en texto. No la guardamos. La voz del asistente es la de tu navegador.</p>
    </div>
  );
}

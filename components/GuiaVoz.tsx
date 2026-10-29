"use client";

import { useEffect, useRef, useState } from "react";
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

type Estado = "lista" | "grabando" | "procesando" | "bien" | "repetir";

export default function GuiaVoz({ perfil, onPerfil }: { perfil: Perfil; onPerfil: (p: Partial<Perfil>) => void }) {
  const [respondidas, setRespondidas] = useState<Set<Clave>>(new Set());
  const [indice, setIndice] = useState(0);
  const [estado, setEstado] = useState<Estado>("lista");
  const [eco, setEco] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [escribir, setEscribir] = useState(false);
  const [texto, setTexto] = useState("");
  const grabador = useRef<MediaRecorder | null>(null);
  const trozos = useRef<Blob[]>([]);

  const pendientes = PREGUNTAS.filter((q) => !contestada(perfil, q.clave, respondidas));
  const hechas = PREGUNTAS.length - pendientes.length;
  const actual = PREGUNTAS[indice];
  const terminado = pendientes.length === 0;

  // Si la pregunta actual ya quedó contestada (por una respuesta anterior o por "Cargar ejemplo"), avanza a la siguiente pendiente.
  useEffect(() => {
    if (estado === "grabando" || estado === "procesando" || estado === "bien") return;
    if (actual && contestada(perfil, actual.clave, respondidas)) {
      const sig = PREGUNTAS.findIndex((q) => !contestada(perfil, q.clave, respondidas));
      if (sig >= 0) setIndice(sig);
    }
  }, [perfil, respondidas, actual, estado]);

  function avanzar(conRespondida?: Clave) {
    const nuevas = new Set(respondidas);
    if (conRespondida) nuevas.add(conRespondida);
    setRespondidas(nuevas);
    setEstado("bien");
    setTimeout(() => {
      const sig = PREGUNTAS.findIndex((q) => !contestada({ ...perfil }, q.clave, nuevas) && q.clave !== conRespondida);
      if (sig >= 0) setIndice(sig);
      setEstado("lista");
      setEscribir(false);
      setTexto("");
    }, 1100);
  }

  async function interpretar(respuesta: string) {
    setEstado("procesando");
    setEco(respuesta);
    try {
      const r = await fetch("/api/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: respuesta, pregunta: actual.texto }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const datos = j.perfil as Partial<Perfil> & { cultivo?: string };
      onPerfil(datos);
      const entendio =
        actual.clave === "cultivoHa" ? datos.hectareas !== undefined
        : actual.clave === "municipio" ? Boolean(datos.municipio)
        : actual.clave === "edad" ? datos.edad !== undefined
        : datos[actual.clave] !== undefined;
      if (entendio) { setMensaje(""); avanzar(actual.clave); }
      else { setMensaje(j.avisos?.[0] ?? "No te entendí bien. ¿Me lo repites?"); setEstado("repetir"); }
    } catch {
      setMensaje("No pude procesar tu respuesta. Intenta de nuevo o escríbela.");
      setEstado("repetir");
    }
  }

  async function grabar() {
    setMensaje("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      trozos.current = [];
      rec.ondataavailable = (e) => e.data.size && trozos.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(trozos.current, { type: rec.mimeType || "audio/webm" });
        setEstado("procesando");
        try {
          const form = new FormData();
          form.append("audio", new File([blob], blob.type.includes("mp4") ? "voz.m4a" : "voz.webm", { type: blob.type }));
          const r = await fetch("/api/transcribe", { method: "POST", body: form });
          const j = await r.json();
          if (!r.ok || !j.texto) throw new Error(j.error || "No escuché nada.");
          await interpretar(j.texto);
        } catch (e) {
          setMensaje((e as Error).message + " Intenta de nuevo o escribe tu respuesta.");
          setEstado("repetir");
        }
      };
      rec.start();
      grabador.current = rec;
      setEstado("grabando");
    } catch {
      setMensaje("No pude usar el micrófono. Revisa el permiso del navegador, o escribe o toca tu respuesta.");
      setEscribir(true);
      setEstado("repetir");
    }
  }

  if (terminado) {
    return (
      <div className="guia guia-fin" role="status">
        <div className="guia-barra"><div style={{ width: "100%" }} /></div>
        <strong>¡Listo! Ya tengo los datos de tu parcela.</strong>
        <p>Revísalos abajo y corrige lo que haga falta. Luego sigue con el paso 2.</p>
        <button type="button" className="boton secundario" onClick={() => { setRespondidas(new Set()); setIndice(0); onPerfil({ hectareas: null, municipio: null, beneficiarioSader: null, posesionPredio: null, edad: undefined }); }}>
          Empezar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="guia">
      <div className="guia-cabeza">
        <span>Pregunta {Math.min(hechas + 1, PREGUNTAS.length)} de {PREGUNTAS.length}</span>
        <div className="guia-barra" aria-hidden><div style={{ width: `${(hechas / PREGUNTAS.length) * 100}%` }} /></div>
      </div>

      <p className="guia-pregunta" aria-live="polite">{actual.texto}</p>
      <p className="guia-ayuda">{actual.ayuda}</p>

      <div className="guia-centro">
        {estado === "grabando" ? (
          <button type="button" className="mic grabando" onClick={() => grabador.current?.stop()} aria-label="Terminar de hablar">
            <span>Terminar</span>
          </button>
        ) : (
          <button type="button" className={`mic${estado === "bien" ? " bien" : ""}`} onClick={grabar} disabled={estado === "procesando" || estado === "bien"} aria-label="Hablar">
            <span>{estado === "procesando" ? "Escuchando…" : estado === "bien" ? "✓" : "Hablar"}</span>
          </button>
        )}
        {actual.rapidas && estado !== "grabando" && (
          <div className="opciones guia-rapidas">
            {actual.rapidas.map(([t, datos]) => (
              <button key={t} type="button" className="opcion" disabled={estado === "procesando" || estado === "bien"}
                onClick={() => { setEco(t); onPerfil(datos); avanzar(actual.clave); }}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {estado === "grabando" && <p className="guia-escucho">Te escucho… cuando termines, toca “Terminar”.</p>}
      {eco && estado !== "grabando" && <p className="guia-eco">Dijiste: “{eco}”</p>}
      {estado === "bien" && <p className="guia-bien">¡Entendido!</p>}
      {mensaje && <p className="voz-mensaje" role="status">{mensaje}</p>}

      <div className="acciones guia-pie">
        {!escribir ? (
          <button type="button" className="enlace" onClick={() => setEscribir(true)}>Prefiero escribir</button>
        ) : (
          <form className="guia-escribir" onSubmit={(e) => { e.preventDefault(); if (texto.trim()) interpretar(texto.trim()); }}>
            <input id="guia-texto" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu respuesta" aria-label="Tu respuesta" />
            <button type="submit" className="boton secundario" disabled={!texto.trim() || estado === "procesando"}>Enviar</button>
          </form>
        )}
        {actual.opcional && <button type="button" className="enlace" onClick={() => avanzar(actual.clave)}>Saltar</button>}
      </div>
      <p className="fuente">Tu voz se envía a Mistral (Voxtral) solo para convertirla en texto. No la guardamos.</p>
    </div>
  );
}

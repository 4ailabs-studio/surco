"use client";

import { useRef, useState } from "react";
import type { Perfil } from "@/lib/tipos";

type Estado = "listo" | "grabando" | "transcribiendo" | "analizando";

export default function VozCard({ onPerfil }: { onPerfil: (p: Partial<Perfil>) => void }) {
  const [estado, setEstado] = useState<Estado>("listo");
  const [texto, setTexto] = useState("");
  const [mensajes, setMensajes] = useState<string[]>([]);
  const [escribir, setEscribir] = useState(false);
  const grabador = useRef<MediaRecorder | null>(null);
  const trozos = useRef<Blob[]>([]);

  async function analizar(t: string) {
    if (!t.trim()) return;
    setEstado("analizando");
    try {
      const r = await fetch("/api/perfil", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: t }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      onPerfil(j.perfil);
      const llenos = Object.keys(j.perfil).length;
      setMensajes([...(j.avisos ?? []), llenos ? `Llené ${llenos} dato(s). Revísalos abajo y corrige lo que haga falta.` : "No encontré datos; llénalos abajo."]);
    } catch (e) {
      setMensajes([(e as Error).message || "No pude leer tus datos. Llénalos abajo."]);
    } finally {
      setEstado("listo");
    }
  }

  async function empezar() {
    setMensajes([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      trozos.current = [];
      rec.ondataavailable = (e) => e.data.size && trozos.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(trozos.current, { type: rec.mimeType || "audio/webm" });
        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        setEstado("transcribiendo");
        try {
          const form = new FormData();
          form.append("audio", new File([blob], `voz.${ext}`, { type: blob.type }));
          const r = await fetch("/api/transcribe", { method: "POST", body: form });
          const j = await r.json();
          if (!r.ok || !j.texto) throw new Error(j.error || "No escuché nada. Intenta de nuevo o escribe.");
          setTexto(j.texto);
          await analizar(j.texto);
        } catch (e) {
          setMensajes([(e as Error).message]);
          setEscribir(true);
          setEstado("listo");
        }
      };
      rec.start();
      grabador.current = rec;
      setEstado("grabando");
    } catch {
      setMensajes(["No pude usar el micrófono. Revisa el permiso del navegador o escribe tus datos."]);
      setEscribir(true);
    }
  }

  const ocupado = estado === "transcribiendo" || estado === "analizando";

  return (
    <div className="voz">
      <div className="acciones">
        {estado !== "grabando" ? (
          <button type="button" className="boton principal" onClick={empezar} disabled={ocupado}>
            {estado === "transcribiendo" ? "Escuchando lo que dijiste…" : estado === "analizando" ? "Leyendo tus datos…" : "Hablar"}
          </button>
        ) : (
          <button type="button" className="boton grabando" onClick={() => grabador.current?.stop()}>Terminar</button>
        )}
        {!escribir && <button type="button" className="boton secundario" onClick={() => setEscribir(true)}>Escribir en lugar de hablar</button>}
      </div>
      <p className="voz-ayuda">
        {estado === "grabando"
          ? "Te escucho. Di cuántas hectáreas siembras, tu municipio y si estás en algún programa de SADER."
          : "Por ejemplo: “Siembro 3 hectáreas de maíz en Toluca y estoy en Producción para el Bienestar.”"}
      </p>
      {(escribir || texto) && (
        <div className="campo">
          <span>Lo que dijiste</span>
          <textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe aquí cómo es tu parcela" />
          <div className="acciones"><button type="button" className="boton secundario" onClick={() => analizar(texto)} disabled={ocupado || !texto.trim()}>Llenar mis datos</button></div>
        </div>
      )}
      {mensajes.map((m) => <p key={m} className="voz-mensaje" role="status">{m}</p>)}
      <p className="fuente">Tu voz se envía a Mistral (Voxtral) solo para convertirla en texto. No la guardamos.</p>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, FileText, Loader2, Mic, Printer, RotateCcw, Square, Volume2, VolumeX } from "lucide-react";
import Avatar from "./Avatar";
import { callar, decir, grabarYTranscribir, siONo, type Grabacion } from "./voz";
import { calcularCredito, incentivoSeguro, segmentoPara, TASA_BRUTA, TASA_NETA } from "@/lib/credito";
import { resultadoCuentas, resumenSerie, senalAlerta } from "@/lib/cuentas";
import { checklistExpediente, evaluarElegibilidad, NO_PUEDEN_EXIGIR } from "@/lib/expediente";
import { balanceDecision, type Preocupacion, type Respaldo, type Uso } from "@/lib/balance";
import { municipiosEdomex, referenciaCosto, serieMunicipio } from "@/lib/datos";
import type { Perfil } from "@/lib/tipos";
import { fetchConReintento } from "@/lib/red";

type Paso =
  | "inicio" | "cultivo" | "hectareas" | "municipio" | "sader" | "tierra" | "edad"
  | "califica" | "cuentas" | "uso" | "preocupa" | "respaldo" | "lectura" | "papeles" | "hoja" | "no-pedir";

const ORDEN: Paso[] = ["inicio", "cultivo", "hectareas", "municipio", "sader", "califica", "cuentas", "uso", "preocupa", "respaldo", "lectura", "tierra", "edad", "papeles", "hoja"];

const PREGUNTA: Partial<Record<Paso, string>> = {
  cultivo: "¿Qué siembras?",
  hectareas: "¿Cuántas hectáreas siembras?",
  municipio: "¿En qué municipio está tu parcela?",
  sader: "¿Estás en algún programa de SADER, como Producción para el Bienestar?",
  tierra: "¿Tienes papeles de tu tierra? Puede ser propia, ejidal o rentada.",
  edad: "¿Tienes más de 70 años?",
  uso: "¿Para qué usarías el dinero?",
  preocupa: "¿Qué es lo que más te preocupa?",
  respaldo: "Si la cosecha sale mal, ¿tienes con qué pagar?",
  lectura: "¿Quieres preparar tu solicitud?",
  papeles: "¿Qué papeles ya tienes?",
};

const pesos = (n: number) => (Number.isFinite(n) ? n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }) : "—");
const dec = (n: number, d = 1) => (Number.isFinite(n) ? n.toLocaleString("es-MX", { maximumFractionDigits: d, minimumFractionDigits: d }) : "—");
const MESES = 8;

const INICIAL: Perfil = { cultivo: "maíz", hectareas: null, estado: "México", municipio: null, beneficiarioSader: null, posesionPredio: null };

export default function Pantallas() {
  const municipios = useMemo(() => municipiosEdomex(), []);
  const ref = referenciaCosto();
  const [paso, setPaso] = useState<Paso>("inicio");
  const [historial, setHistorial] = useState<Paso[]>([]);
  const [perfil, setPerfil] = useState<Perfil>(INICIAL);
  const [mayor70, setMayor70] = useState<boolean | null>(null);
  const [uso, setUso] = useState<Uso | null>(null);
  const [preocupa, setPreocupa] = useState<Preocupacion | null>(null);
  const [respaldo, setRespaldo] = useState<Respaldo | null>(null);
  const [tengo, setTengo] = useState<Record<string, boolean>>({});
  const [asistente, setAsistente] = useState(false);
  type VozEstado = "inactivo" | "hablando" | "grabando" | "transcribiendo" | "entendiendo" | "listo" | "error";
  const [voz, setVoz] = useState<VozEstado>("inactivo");
  const [segundos, setSegundos] = useState(0);
  const [escuchado, setEscuchado] = useState("");
  const grabando = voz === "grabando";
  const pensando = voz === "transcribiendo" || voz === "entendiendo";
  const [nivel, setNivel] = useState(0);
  const [aviso, setAviso] = useState("");
  const [haTexto, setHaTexto] = useState("");
  const [busca, setBusca] = useState("");
  const grab = useRef<Grabacion | null>(null);
  const pasoRef = useRef<Paso>("inicio");
  pasoRef.current = paso;
  const ocupadoRef = useRef(false);

  // Cálculos (código determinista)
  const ha = perfil.hectareas ?? 0;
  const serie = perfil.municipio ? serieMunicipio(perfil.municipio) : [];
  const resumen = resumenSerie(serie);
  const costoHa = ref?.totalFinanciablePorHa ?? 0;
  const monto = Math.round(ha * costoHa);
  let credito: ReturnType<typeof calcularCredito> | null = null;
  try { if (monto > 0 && segmentoPara(monto) !== null) credito = calcularCredito({ monto, meses: MESES }); } catch { credito = null; }
  const rendimiento = resumen?.p50 ?? ref?.rendimientoTHa.probable ?? 0;
  const precio = resumen?.precioMedio ?? ref?.precioPorTon ?? 0;
  const cuentas = credito ? resultadoCuentas({ hectareas: ha, rendimientoTHa: rendimiento, precioPorTon: precio, costoDirectoPorHa: costoHa, interes: credito.interesNeto }) : null;
  const alerta = cuentas ? senalAlerta(cuentas.rendimientoEquilibrioTHa, resumen) : "sin-datos";
  const eleg = evaluarElegibilidad(perfil);
  const lectura = balanceDecision({ uso, preocupacion: preocupa, respaldo, alerta });
  const checklist = checklistExpediente({ ...perfil, edad: mayor70 ? 71 : mayor70 === false ? 60 : undefined });
  const seguro = credito ? incentivoSeguro(monto) : null;

  const idx = Math.max(0, ORDEN.indexOf(paso));
  const progreso = paso === "no-pedir" ? 1 : idx / (ORDEN.length - 1);

  function ir(siguiente: Paso) {
    callar();
    grab.current?.detener();
    setAviso("");
    setVoz("inactivo");
    setEscuchado("");
    setHistorial((h) => [...h, paso]);
    setPaso(siguiente);
  }
  function siguienteDe(p: Paso): Paso { return ORDEN[Math.min(ORDEN.indexOf(p) + 1, ORDEN.length - 1)]; }
  function avanzar() { ir(siguienteDe(paso)); }
  function atras() {
    callar();
    grab.current?.detener();
    setVoz("inactivo");
    setAviso("");
    setHistorial((h) => { const c = [...h]; const prev = c.pop(); if (prev) setPaso(prev); return c; });
  }
  function reiniciar() {
    callar();
    grab.current?.detener();
    setVoz("inactivo");
    setAviso("");
    setEscuchado("");
    setPerfil(INICIAL); setMayor70(null); setUso(null); setPreocupa(null); setRespaldo(null); setTengo({}); setHaTexto(""); setBusca("");
    setHistorial([]); setPaso("inicio");
  }

  // Asistente: lee la pregunta de cada pantalla y, si admite voz, escucha
  useEffect(() => {
    if (!asistente) return;
    const textoPantalla =
      paso === "califica" ? (eleg.veredicto === "cumple-basico" ? "Cumples lo básico para Cosechando Soberanía." : "Falta confirmar algo en tu CADER.")
      : paso === "cuentas" && cuentas ? `Con tus números te quedarían ${Math.round(cuentas.utilidad)} pesos. Para no perder necesitas ${dec(cuentas.rendimientoEquilibrioTHa)} toneladas por hectárea.`
      : paso === "lectura" && lectura ? `${lectura.titulo}. ${lectura.texto} ¿Quieres preparar tu solicitud?`
      : PREGUNTA[paso];
    if (!textoPantalla) return;
    let vivo = true;
    setVoz("hablando");
    decir(textoPantalla).then(() => {
      if (vivo) setVoz((v) => (v === "hablando" ? "inactivo" : v));
      if (vivo && ["hectareas", "municipio", "sader", "tierra", "edad", "respaldo"].includes(paso)) escuchar();
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso, asistente]);

  async function interpretarPerfil(texto: string, pregunta: string): Promise<Partial<Perfil>> {
    const r = await fetchConReintento("/api/perfil", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto, pregunta }) }, { tiempoMs: 35000, intentos: 1 });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.perfil) throw new Error(j.error || "No pude entender la respuesta.");
    return j.perfil as Partial<Perfil>;
  }

  // Al desmontar: apagar micrófono y voz
  useEffect(() => () => { grab.current?.detener(); callar(); }, []);

  // Cronómetro mientras graba
  useEffect(() => {
    if (voz !== "grabando") return;
    setSegundos(0);
    const t = setInterval(() => setSegundos((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [voz]);

  async function escuchar() {
    if (ocupadoRef.current) return; // evita doble toque
    ocupadoRef.current = true;
    const pasoInicial = paso;
    const sigueAqui = () => pasoRef.current === pasoInicial;
    setAviso("");
    setEscuchado("");
    callar();
    try {
      const g = await grabarYTranscribir(setNivel, () => setVoz("transcribiendo"));
      grab.current = g;
      setVoz("grabando");
      const texto = await g.resultado;
      if (!sigueAqui()) return; // el usuario ya cambió de pantalla
      setEscuchado(texto);
      setVoz("entendiendo");
      const p = paso;
      let ok = false;
      if (p === "hectareas" || p === "municipio") {
        const datos = await interpretarPerfil(texto, PREGUNTA[p]!);
        if (p === "hectareas" && datos.hectareas) { setPerfil((x) => ({ ...x, hectareas: datos.hectareas! })); setHaTexto(String(datos.hectareas)); ok = true; }
        if (p === "municipio" && datos.municipio) { setPerfil((x) => ({ ...x, municipio: datos.municipio! })); setBusca(datos.municipio); ok = true; }
      } else {
        const v = siONo(texto);
        if (v !== null || /no s[eé]/i.test(texto)) {
          if (p === "sader") setPerfil((x) => ({ ...x, beneficiarioSader: v }));
          if (p === "tierra") setPerfil((x) => ({ ...x, posesionPredio: v }));
          if (p === "edad") setMayor70(v);
          if (p === "respaldo") setRespaldo(v ? "si" : "no");
          ok = true;
        }
      }
      if (!sigueAqui()) return;
      if (ok) {
        setVoz("listo");
        if (asistente) await decir("Entendido.");
        else await new Promise((r) => setTimeout(r, 1100));
        if (sigueAqui()) avanzar();
      } else {
        setVoz("error");
        setAviso("Lo escuché, pero no lo entendí. Inténtalo de nuevo o toca una opción.");
        if (asistente) decir("No te entendí. Puedes tocar una opción.");
      }
    } catch (e) {
      if (!sigueAqui()) return;
      setVoz("error");
      const err = e as Error;
      setAviso(err.name === "NotAllowedError" || err.message?.includes("Permission")
        ? "No pude usar el micrófono. Revisa el permiso del navegador o toca una opción."
        : `${err.message} Inténtalo de nuevo o toca una opción.`);
    } finally {
      ocupadoRef.current = false;
    }
  }

  const Opcion = ({ texto, activa, onClick }: { texto: string; activa?: boolean; onClick: () => void }) => (
    <button type="button" className={`w-opcion${activa ? " activa" : ""}`} onClick={onClick}>
      <span>{texto}</span>{activa && <Check size={20} aria-hidden />}
    </button>
  );
  const SiNo = ({ valor, onElegir }: { valor: boolean | null | undefined; onElegir: (v: boolean | null) => void }) => (
    <div className="w-opciones">
      <Opcion texto="Sí" activa={valor === true} onClick={() => { onElegir(true); avanzar(); }} />
      <Opcion texto="No" activa={valor === false} onClick={() => { onElegir(false); avanzar(); }} />
      <Opcion texto="No sé" onClick={() => { onElegir(null); avanzar(); }} />
    </div>
  );
  const mmss = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
  const botonVoz = () => (
    <div className={`w-voz-panel ${voz}`} aria-live="polite">
      {grabando ? (
        <button type="button" className="w-mic grabando" onClick={() => grab.current?.detener()} aria-label="Terminar de grabar"
          style={{ boxShadow: `0 0 0 ${6 + nivel * 20}px rgba(184,74,52,.18)` }}>
          <Square size={26} fill="currentColor" aria-hidden />
        </button>
      ) : (
        <button type="button" className="w-mic" onClick={escuchar} disabled={pensando || voz === "listo" || voz === "hablando"} aria-label="Responder con tu voz">
          {pensando ? <Loader2 size={30} className="w-gira" aria-hidden /> : voz === "listo" ? <Check size={32} aria-hidden /> : <Mic size={30} aria-hidden />}
        </button>
      )}
      <div className="w-voz-estado">
        {voz === "inactivo" && <><b>Responder con tu voz</b><span>Toca el micrófono y habla.</span></>}
        {voz === "hablando" && <><b><Volume2 size={18} aria-hidden /> Surco está hablando…</b><span>Al terminar te escucho.</span></>}
        {voz === "grabando" && (
          <>
            <b className="w-rec"><span className="w-punto" aria-hidden /> Grabando {mmss}</b>
            <div className="w-niveles" aria-hidden>
              {[0.35, 0.7, 1, 0.7, 0.35].map((f, i) => <span key={i} style={{ height: `${8 + Math.min(1, nivel * 1.4) * f * 30}px` }} />)}
            </div>
            <span>Toca el cuadro para terminar, o me detengo solo cuando dejes de hablar.</span>
          </>
        )}
        {voz === "transcribiendo" && <><b>Grabación terminada</b><span>Convirtiendo tu voz en texto…</span></>}
        {voz === "entendiendo" && <><b>Entendiendo tu respuesta…</b>{escuchado && <span>Escuché: «{escuchado}»</span>}</>}
        {voz === "listo" && <><b className="w-ok"><Check size={18} aria-hidden /> ¡Listo!</b><span>Escuché: «{escuchado}»</span></>}
        {voz === "error" && <><b className="w-mal"><AlertCircle size={18} aria-hidden /> No quedó</b>{escuchado ? <span>Escuché: «{escuchado}»</span> : <span>Vuelve a intentarlo.</span>}</>}
      </div>
    </div>
  );

  const pregunta = PREGUNTA[paso];

  return (
    <div className="w-app">
      <header className="w-barra">
        <div className="w-marca"><Avatar size={36} /><span>Surco</span></div>
        {paso !== "inicio" && (
          <div className="w-progreso" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progreso * 100)}>
            <div style={{ width: `${progreso * 100}%` }} />
          </div>
        )}
        {paso !== "inicio" && (
          <button type="button" className="w-icono" onClick={() => { if (asistente) callar(); setAsistente(!asistente); }} aria-label={asistente ? "Apagar asistente de voz" : "Encender asistente de voz"} title={asistente ? "Asistente encendido" : "Asistente apagado"}>
            {asistente ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
        )}
      </header>

      <main className="w-pantalla" key={paso}>
        {paso === "inicio" && (
          <section className="w-centro">
            <Avatar size={128} hablando={asistente} />
            <h1>Hola, soy Surco.</h1>
            <p className="w-sub">Te ayudo a decidir con calma si pedir un crédito para tu siembra, y a llegar preparado. Son unas preguntas cortas.</p>
            <div className="w-acciones-col">
              <button type="button" className="w-primario" onClick={() => { setAsistente(true); avanzar(); }}><Volume2 size={22} aria-hidden /> Empezar con asistente de voz</button>
              <button type="button" className="w-secundario" onClick={() => { setAsistente(false); avanzar(); }}>Empezar sin voz</button>
            </div>
            <p className="w-nota">No guardamos tus datos. Surco no es un banco y no aprueba créditos.</p>
          </section>
        )}

        {pregunta && paso !== "lectura" && <h1 className="w-pregunta">{pregunta}</h1>}

        {paso === "cultivo" && (
          <div className="w-opciones">
            {[["maíz", "Maíz"], ["frijol", "Frijol"], ["otro cultivo", "Otro cultivo"]].map(([v, t]) => (
              <Opcion key={v} texto={t} activa={perfil.cultivo === v} onClick={() => { setPerfil((x) => ({ ...x, cultivo: v })); avanzar(); }} />
            ))}
          </div>
        )}

        {paso === "hectareas" && (
          <>
            {botonVoz()}
            <form className="w-entrada" onSubmit={(e) => { e.preventDefault(); const n = Number(haTexto.replace(",", ".")); if (n > 0 && n <= 10000) { setPerfil((x) => ({ ...x, hectareas: n })); avanzar(); } else setAviso("Escribe un número de hectáreas entre 0.1 y 10,000."); }}>
              <label htmlFor="w-ha">O escríbelo</label>
              <div className="w-fila">
                <input id="w-ha" inputMode="decimal" value={haTexto} onChange={(e) => setHaTexto(e.target.value)} placeholder="3" />
                <span className="w-unidad">hectáreas</span>
                <button type="submit" className="w-primario w-chico" aria-label="Continuar"><ArrowRight size={22} /></button>
              </div>
            </form>
          </>
        )}

        {paso === "municipio" && (
          <>
            {botonVoz()}
            <div className="w-entrada">
              <label htmlFor="w-mun">O búscalo ({municipios.length} municipios del Estado de México)</label>
              <input id="w-mun" list="w-lista-mun" value={busca} placeholder="Escribe, por ejemplo: Tol…" autoComplete="off"
                onChange={(e) => {
                  setBusca(e.target.value);
                  const m = municipios.find((x) => x === e.target.value);
                  if (m) { setPerfil((x) => ({ ...x, municipio: m })); avanzar(); }
                }} />
              <datalist id="w-lista-mun">{municipios.map((m) => <option key={m} value={m} />)}</datalist>
            </div>
          </>
        )}

        {paso === "sader" && (<><SiNo valor={perfil.beneficiarioSader} onElegir={(v) => setPerfil((x) => ({ ...x, beneficiarioSader: v }))} />{botonVoz()}</>)}
        {paso === "tierra" && (<><p className="w-sub">Ya casi terminamos. Si no los tienes, no pasa nada: te decimos cuáles conseguir.</p><SiNo valor={perfil.posesionPredio} onElegir={(v) => setPerfil((x) => ({ ...x, posesionPredio: v }))} />{botonVoz()}</>)}
        {paso === "edad" && (<><p className="w-sub">Solo así sabemos si te pueden pedir un aval.</p><SiNo valor={mayor70} onElegir={setMayor70} />{botonVoz()}</>)}

        {paso === "califica" && (
          <section className="w-resultado">
            <div className={`w-sello ${eleg.veredicto === "cumple-basico" ? "bien" : "atento"}`}>
              {eleg.veredicto === "cumple-basico" ? <Check size={40} aria-hidden /> : <span aria-hidden>!</span>}
            </div>
            <h1>{eleg.veredicto === "cumple-basico" ? "Cumples lo básico" : "Falta confirmar algo"}</h1>
            <ul className="w-lista">{eleg.motivos.map((m) => <li key={m}>{m}</li>)}</ul>
            {eleg.veredicto !== "cumple-basico" && (
              <p className="w-nota">Si no entras a Cosechando Soberanía hay otras rutas: créditos con respaldo de FIRA en bancos o cajas, cooperativas o banca comercial (compara el costo total). Tu CADER te orienta.</p>
            )}
          </section>
        )}

        {paso === "cuentas" && (
          <section className="w-resultado">
            <h1>Tus cuentas</h1>
            {!cuentas || !credito ? (
              <p className="w-sub">No pude calcular: revisa tus hectáreas.</p>
            ) : (
              <>
                <div className="w-cifra-grande">
                  <span>Te quedaría después de pagar</span>
                  <b className={cuentas.utilidad < 0 ? "neg" : ""}>{pesos(cuentas.utilidad)}</b>
                </div>
                <div className="w-cifras">
                  <div><span>Pedirías</span><b>{pesos(monto)}</b></div>
                  <div><span>Venderías</span><b>{pesos(cuentas.ingreso)}</b></div>
                  <div><span>Para no perder</span><b>{dec(cuentas.rendimientoEquilibrioTHa)} t/ha</b></div>
                </div>
                <div className={`w-alerta ${alerta}`}>
                  {alerta === "bajo" && <>En {perfil.municipio}, 3 de cada 4 años se cosecha más que eso.</>}
                  {alerta === "medio" && <>En {perfil.municipio} eso se logra más o menos la mitad de los años.</>}
                  {alerta === "alto" && <>En {perfil.municipio}, la mitad de los años se cosecha menos de {dec(resumen?.p50 ?? 0)} t/ha. Es arriesgado.</>}
                  {alerta === "sin-datos" && <>No hay datos suficientes de tu municipio para comparar.</>}
                </div>
                <p className="w-nota">Intereses a {MESES} meses: {pesos(credito.interesBruto)} a {(TASA_BRUTA * 100).toFixed(1)} %, o {pesos(credito.interesNeto)} a {(TASA_NETA * 100).toFixed(1)} % si pagas a tiempo. Datos: SIAP ({perfil.municipio}) y FIRA Agrocostos {ref?.anio}.</p>
              </>
            )}
          </section>
        )}

        {paso === "uso" && (
          <div className="w-opciones">
            {([["insumos", "Semilla, fertilizante o mano de obra"], ["maquinaria", "Renta de maquinaria"], ["otro", "Otro gasto"]] as const).map(([v, t]) => (
              <Opcion key={v} texto={t} activa={uso === v} onClick={() => { setUso(v); avanzar(); }} />
            ))}
          </div>
        )}

        {paso === "preocupa" && (
          <div className="w-opciones">
            {([["pagar", "No poder pagar"], ["cosecha", "Que se pierda la cosecha"], ["papeles", "Los papeles y trámites"], ["confianza", "No confío en el banco"], ["nada", "Nada en especial"]] as const).map(([v, t]) => (
              <Opcion key={v} texto={t} activa={preocupa === v} onClick={() => { setPreocupa(v); avanzar(); }} />
            ))}
          </div>
        )}

        {paso === "respaldo" && (
          <>
            <p className="w-sub">Ahorro, otro ingreso o apoyo de la familia.</p>
            <div className="w-opciones">
              <Opcion texto="Sí" activa={respaldo === "si"} onClick={() => { setRespaldo("si"); avanzar(); }} />
              <Opcion texto="No" activa={respaldo === "no"} onClick={() => { setRespaldo("no"); avanzar(); }} />
            </div>
            {botonVoz()}
          </>
        )}

        {paso === "lectura" && lectura && (
          <section className="w-resultado">
            <div className={`w-sello ${lectura.tipo === "listo" ? "bien" : lectura.tipo === "miedo" || lectura.tipo === "pensar" ? "atento" : "alto"}`}><Avatar size={64} /></div>
            <h1>{lectura.titulo}</h1>
            <p className="w-sub">{lectura.texto}</p>
            <p className="w-nota"><b>Siguiente paso:</b> {lectura.siguiente}</p>
            <h2 className="w-pregunta-chica">{PREGUNTA.lectura}</h2>
            <div className="w-opciones">
              <Opcion texto="Sí, quiero prepararla" onClick={() => ir("tierra")} />
              <Opcion texto="Por ahora no" onClick={() => ir("no-pedir")} />
            </div>
          </section>
        )}

        {paso === "papeles" && (
          <>
            <ul className="w-checklist">
              {checklist.filter((i) => i.obligatorio).map((i) => (
                <li key={i.id}>
                  <button type="button" className={`w-check${tengo[i.id] ? " activa" : ""}`} aria-pressed={Boolean(tengo[i.id])}
                    onClick={() => setTengo((t) => ({ ...t, [i.id]: !t[i.id] }))}>
                    <span className="w-caja">{tengo[i.id] && <Check size={18} aria-hidden />}</span>
                    <span>{i.texto}{i.estado === "por-confirmar" && <small>Confirmar en tu CADER</small>}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="w-no-exigir"><b>Esto no te lo pueden pedir:</b> {NO_PUEDEN_EXIGIR.join(", ").toLowerCase()}.</div>
          </>
        )}

        {paso === "hoja" && (
          <section className="w-hoja" aria-label="Tu hoja para el intermediario">
            <div className="w-hoja-cabeza"><FileText size={22} aria-hidden /><h1>Mi solicitud de avío</h1></div>
            <p className="w-nota">Preparada con Surco. No es una aprobación ni una oferta de crédito.</p>
            <dl>
              <dt>Cultivo</dt><dd>{perfil.cultivo} <small>declarado</small></dd>
              <dt>Superficie</dt><dd>{dec(ha)} ha <small>declarado</small></dd>
              <dt>Municipio</dt><dd>{perfil.municipio ?? "—"}, Méx.</dd>
              <dt>Programa SADER</dt><dd>{perfil.beneficiarioSader === true ? "Sí" : perfil.beneficiarioSader === false ? "No" : "Por confirmar"} <small>declarado</small></dd>
              {credito && cuentas && (<>
                <dt>Monto</dt><dd>{pesos(monto)} a {MESES} meses</dd>
                <dt>Total si pago a tiempo</dt><dd>{pesos(credito.totalNeto)}</dd>
                <dt>Venta esperada</dt><dd>{pesos(cuentas.ingreso)}</dd>
                <dt>Para no perder</dt><dd>{dec(cuentas.rendimientoEquilibrioTHa)} t/ha</dd>
                <dt>Apoyo al seguro</dt><dd>{pesos(seguro?.monto ?? 0)}</dd>
              </>)}
              {resumen && (<><dt>Rendimiento típico (SIAP)</dt><dd>{dec(resumen.p25)}–{dec(resumen.p75)} t/ha</dd></>)}
              <dt>Papeles listos</dt><dd>{checklist.filter((i) => tengo[i.id]).length} de {checklist.filter((i) => i.obligatorio).length}</dd>
            </dl>
            <p className="w-hoja-aviso">Llevar esta hoja no implica que el crédito esté aprobado.</p>
            <p className="w-nota">Pregunta al intermediario: la comisión de apertura, si aplica la bonificación de Cosechando Soberanía y cuándo recibirías el dinero.</p>
          </section>
        )}

        {paso === "no-pedir" && (
          <section className="w-centro">
            <Avatar size={110} />
            <h1>Decidir no pedir también es decidir bien.</h1>
            <p className="w-sub">Puedes volver cuando quieras con otros números. Si cambias de opinión, el técnico de tu CADER te puede orientar.</p>
          </section>
        )}

        {aviso && <p className="w-aviso" role="status">{aviso}</p>}
      </main>

      {paso !== "inicio" && (
        <footer className="w-pie">
          <button type="button" className="w-icono" onClick={atras} disabled={!historial.length} aria-label="Atrás"><ArrowLeft size={22} /></button>
          {["califica", "cuentas", "papeles"].includes(paso) && <button type="button" className="w-primario" onClick={avanzar}>Continuar <ArrowRight size={20} aria-hidden /></button>}
          {paso === "hoja" && <button type="button" className="w-primario" onClick={() => window.print()}><Printer size={20} aria-hidden /> Imprimir mi hoja</button>}
          {(paso === "hoja" || paso === "no-pedir") && <button type="button" className="w-secundario" onClick={reiniciar}><RotateCcw size={18} aria-hidden /> Empezar de nuevo</button>}
        </footer>
      )}
    </div>
  );
}

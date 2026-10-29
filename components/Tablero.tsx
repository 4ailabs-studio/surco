"use client";

import { useMemo, useState } from "react";
import { beneficioProductor, calcularCredito, incentivoSeguro, segmentoPara, TASA_BRUTA, TASA_NETA } from "@/lib/credito";
import { resultadoCuentas, resumenSerie, senalAlerta, sensibilidad } from "@/lib/cuentas";
import { checklistExpediente, evaluarElegibilidad, NO_PUEDEN_EXIGIR, validarPerfil } from "@/lib/expediente";
import { metaAgrocostos, metaSiap, municipiosEdomex, referenciaCosto, serieMunicipio } from "@/lib/datos";
import type { Perfil } from "@/lib/tipos";
import GuiaVoz from "./GuiaVoz";
import { balanceDecision, type Preocupacion, type Respaldo, type Uso } from "@/lib/balance";

const pesos = (n: number) => (Number.isFinite(n) ? n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }) : "—");
const dec = (n: number, d = 1) => (Number.isFinite(n) ? n.toLocaleString("es-MX", { maximumFractionDigits: d, minimumFractionDigits: d }) : "—");
const pct = (n: number) => `${dec(n * 100, 1)} %`;

const PERFIL_VACIO: Perfil = { cultivo: "maíz", hectareas: null, estado: "México", municipio: null, beneficiarioSader: null, posesionPredio: null };
const PERFIL_EJEMPLO: Perfil = { cultivo: "maíz", hectareas: 3, estado: "México", municipio: "Toluca", beneficiarioSader: true, posesionPredio: true, edad: 58 };

const CONTEXTO = [
  { nombre: "Estado de México", valor: 1.1, destacada: true },
  { nombre: "Campeche", valor: 7.9 },
  { nombre: "Todo el país", valor: 6.1 },
  { nombre: "Sinaloa", valor: 34.5 },
];

function SiNo({ valor, onChange, etiquetas = ["Sí", "No", "No sé"] }: { valor: boolean | null; onChange: (v: boolean | null) => void; etiquetas?: string[] }) {
  const opciones: [string, boolean | null][] = [[etiquetas[0], true], [etiquetas[1], false], [etiquetas[2], null]];
  return (
    <div className="opciones" role="group">
      {opciones.map(([t, v]) => (
        <button key={t} type="button" className="opcion" aria-pressed={valor === v} onClick={() => onChange(v)}>{t}</button>
      ))}
    </div>
  );
}

export default function Tablero() {
  const municipios = useMemo(() => municipiosEdomex(), []);
  const ref = referenciaCosto();
  const [perfil, setPerfil] = useState<Perfil>(PERFIL_VACIO);
  const [esEjemplo, setEsEjemplo] = useState(false);
  const [montoTexto, setMontoTexto] = useState<string>("");
  const [meses, setMeses] = useState(8);
  const [costoHa, setCostoHa] = useState<number>(ref?.totalFinanciablePorHa ?? 0);
  const [rendManual, setRendManual] = useState<string>("");
  const [precioManual, setPrecioManual] = useState<string>("");
  const [tengo, setTengo] = useState<Record<string, boolean>>({});
  const [uso, setUso] = useState<Uso | null>(null);
  const [preocupacion, setPreocupacion] = useState<Preocupacion | null>(null);
  const [respaldo, setRespaldo] = useState<Respaldo | null>(null);

  const actualizar = (cambios: Partial<Perfil>) => { setPerfil((p) => ({ ...p, ...cambios })); setEsEjemplo(false); };
  const cargarEjemplo = () => { setPerfil(PERFIL_EJEMPLO); setEsEjemplo(true); setMontoTexto(""); setRendManual(""); setPrecioManual(""); setUso("insumos"); setPreocupacion("pagar"); setRespaldo("no"); };

  const validacion = validarPerfil(perfil);
  const eleg = evaluarElegibilidad(perfil);
  const checklist = checklistExpediente(perfil);
  const serie = perfil.municipio ? serieMunicipio(perfil.municipio) : [];
  const resumen = resumenSerie(serie);

  const ha = perfil.hectareas ?? 0;
  const montoSugerido = Math.round(ha * costoHa);
  const monto = montoTexto.trim() === "" ? montoSugerido : Number(montoTexto.replace(/[^\d.]/g, ""));
  const rendimiento = rendManual ? Number(rendManual) : resumen?.p50 ?? ref?.rendimientoTHa.probable ?? 0;
  const precio = precioManual ? Number(precioManual) : resumen?.precioMedio ?? ref?.precioPorTon ?? 0;

  let errorMonto: string | null = null;
  let credito: ReturnType<typeof calcularCredito> | null = null;
  if (validacion.ok) {
    try {
      credito = calcularCredito({ monto, meses });
      if (segmentoPara(monto) === null) { errorMonto = "Ese monto pasa del tope de $1,300,000 del programa."; credito = null; }
    } catch (e) { errorMonto = (e as Error).message; }
  }
  const seguro = credito ? incentivoSeguro(monto) : null;
  const escenario = credito ? { hectareas: ha, rendimientoTHa: rendimiento, precioPorTon: precio, costoDirectoPorHa: costoHa, interes: credito.interesNeto } : null;
  const cuentas = escenario ? resultadoCuentas(escenario) : null;
  const alerta = cuentas ? senalAlerta(cuentas.rendimientoEquilibrioTHa, resumen) : "sin-datos";
  const sens = escenario ? sensibilidad(escenario, [-0.2, 0, 0.2]) : null;
  const beneficio = credito ? beneficioProductor(monto, meses) : 0;
  const docsListos = checklist.filter((i) => tengo[i.id]).length;
  const lectura = balanceDecision({ uso, preocupacion, respaldo, alerta });
  const esMaiz = perfil.cultivo === "maíz";
  const maximo = Math.max(...CONTEXTO.map((c) => c.valor));

  const pasoHecho = { 1: validacion.ok, 2: validacion.ok, 3: docsListos >= 5, 4: Boolean(cuentas), 5: false };

  return (
    <div className="marco">
      <header className="encabezado no-imprimir">
        <h1>Surco</h1>
        <p>
          Prepara tu solicitud de crédito de avío para tu maíz: averigua si calificas, junta tus papeles, haz tus cuentas
          con datos de tu municipio y llévate una hoja lista para tu CADER o tu intermediario.
        </p>
        <div className="contexto" aria-label="Unidades de producción con crédito, 2022">
          <span className="contexto-titulo">Unidades de producción que obtuvieron crédito (Censo Agropecuario 2022, INEGI)</span>
          {CONTEXTO.map((c) => (
            <div key={c.nombre} className={`barra${c.destacada ? " destacada" : ""}`}>
              <span>{c.nombre}</span>
              <div className="barra-pista"><div className="barra-relleno" style={{ width: `${(c.valor / maximo) * 100}%` }} /></div>
              <span className="barra-valor">{dec(c.valor)} %</span>
            </div>
          ))}
        </div>
      </header>

      <div className="rejilla">
        <main className="surco no-imprimir">
          <section className={`paso${pasoHecho[1] ? " hecho" : ""}`} aria-labelledby="p1">
            <span className="paso-num" aria-hidden>1</span>
            <h2 id="p1">Cuéntanos de tu parcela</h2>
            <p className="paso-sub">Con esto calculamos todo lo demás. No guardamos tus datos.</p>
            <div className="panel campos">
              <GuiaVoz perfil={perfil} onPerfil={(p) => { setPerfil((prev) => ({ ...prev, ...p })); setEsEjemplo(false); }} />
              <div className="acciones">
                <button type="button" className="boton secundario" onClick={cargarEjemplo}>Cargar ejemplo</button>
                {esEjemplo && <span className="etiqueta-ejemplo">Ejemplo, sin verificar</span>}
              </div>
              <div className="campos dos">
                <label className="campo">
                  <span>Hectáreas que siembras</span>
                  <input inputMode="decimal" value={perfil.hectareas ?? ""} placeholder="Por ejemplo, 3"
                    onChange={(e) => actualizar({ hectareas: e.target.value === "" ? null : Number(e.target.value) })} />
                </label>
                <label className="campo">
                  <span>Municipio (Estado de México)</span>
                  <select value={perfil.municipio ?? ""} onChange={(e) => actualizar({ municipio: e.target.value || null })}>
                    <option value="">Elige tu municipio</option>
                    {municipios.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
              </div>
              <div className="campo"><span>¿Qué siembras?</span>
                <div className="opciones" role="group">
                  {[["maíz", "Maíz"], ["frijol", "Frijol"], ["otro cultivo", "Otro cultivo"]].map(([v, t]) => (
                    <button key={v} type="button" className="opcion" aria-pressed={perfil.cultivo === v} onClick={() => actualizar({ cultivo: v })}>{t}</button>
                  ))}
                </div></div>
              <div className="campo"><span>¿Estás en algún programa de SADER?</span>
                <SiNo valor={perfil.beneficiarioSader} onChange={(v) => actualizar({ beneficiarioSader: v })} /></div>
              <div className="campo"><span>¿Tienes papel de la tierra (propia, ejidal o rentada)?</span>
                <SiNo valor={perfil.posesionPredio} onChange={(v) => actualizar({ posesionPredio: v })} /></div>
              <label className="campo" style={{ maxWidth: 220 }}>
                <span>Tu edad (opcional)</span>
                <input inputMode="numeric" value={perfil.edad ?? ""} onChange={(e) => actualizar({ edad: e.target.value === "" ? undefined : Number(e.target.value) })} />
              </label>
              {!validacion.ok && (perfil.hectareas !== null || perfil.municipio) && validacion.errores.map((e) => <p key={e} className="error">{e}</p>)}
            </div>
          </section>

          <section className={`paso${pasoHecho[2] ? " hecho" : ""}`} aria-labelledby="p2">
            <span className="paso-num" aria-hidden>2</span>
            <h2 id="p2">¿Calificas?</h2>
            <p className="paso-sub">Según las reglas publicadas de Cosechando Soberanía (SADER y FIRA).</p>
            <div className={`veredicto ${eleg.veredicto === "cumple-basico" ? "si" : "confirmar"}`}>
              <div>
                <strong>{eleg.veredicto === "cumple-basico" ? "Cumples lo básico" : "Falta confirmar algo"}</strong>
                <ul className="lista">{eleg.motivos.map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            </div>
            {eleg.veredicto === "por-confirmar" && (
              <div className="rutas">
                <h3>Si no entras a Cosechando Soberanía, todavía tienes opciones</h3>
                <ul>
                  <li>Créditos con respaldo de FIRA para otros cultivos, a través de bancos, cajas populares o parafinancieras.</li>
                  <li>Cajas de ahorro y cooperativas de tu región.</li>
                  <li>Crédito de un banco comercial: compara el costo total (CAT) antes de firmar.</li>
                  <li>El técnico de tu CADER puede decirte qué programa aplica a tu cultivo.</li>
                </ul>
                <p className="fuente">Surco no recomienda ningún intermediario en particular.</p>
              </div>
            )}
          </section>

          <section className={`paso${pasoHecho[4] ? " hecho" : ""}`} aria-labelledby="p4">
            <span className="paso-num" aria-hidden>3</span>
            <h2 id="p4">Haz tus cuentas</h2>
            <p className="paso-sub">Una referencia con datos públicos de tu municipio. Puedes cambiar cualquier número.</p>
            <div className="panel">
              <div className="campos dos">
                <label className="campo"><span>Monto que pedirías</span>
                  <input inputMode="numeric" value={montoTexto} placeholder={montoSugerido ? `${montoSugerido}` : "Primero llena el paso 1"} onChange={(e) => setMontoTexto(e.target.value)} />
                </label>
                <label className="campo"><span>Meses del crédito</span>
                  <select value={meses} onChange={(e) => setMeses(Number(e.target.value))}>
                    {[6, 8, 10, 12, 18, 24].map((m) => <option key={m} value={m}>{m} meses</option>)}
                  </select>
                </label>
                <label className="campo"><span>Costo por hectárea</span>
                  <input inputMode="numeric" value={costoHa} onChange={(e) => setCostoHa(Number(e.target.value) || 0)} />
                </label>
                <label className="campo"><span>Rendimiento (toneladas por hectárea)</span>
                  <input inputMode="decimal" value={rendManual} placeholder={dec(rendimiento)} onChange={(e) => setRendManual(e.target.value)} />
                </label>
                <label className="campo"><span>Precio por tonelada</span>
                  <input inputMode="numeric" value={precioManual} placeholder={`${Math.round(precio)}`} onChange={(e) => setPrecioManual(e.target.value)} />
                </label>
              </div>
              {!esMaiz && <p className="error">Por ahora las cuentas usan datos de maíz. Cambia el costo, el rendimiento y el precio por los de tu cultivo.</p>}
              <p className="fuente">
                Costo: FIRA Agrocostos {ref?.anio}, {ref?.zona?.toLowerCase()}, maíz de temporal (referencia vieja, ajústala). Rendimiento y precio:
                {resumen ? ` mediana y precio medio rural de ${perfil.municipio}, SIAP ${metaSiap.anios[0]}–${resumen.ultimoAnio}.` : " sin datos suficientes de tu municipio; usamos la referencia de FIRA."}
              </p>
              {errorMonto && <p className="error">{errorMonto}</p>}
              {!validacion.ok && <p className="vacio">Llena el paso 1 para ver tus cuentas.</p>}

              {cuentas && credito && (
                <>
                  <div className="cifras">
                    <div className="cifra"><span>Venderías</span><b>{pesos(cuentas.ingreso)}</b></div>
                    <div className="cifra"><span>Costo + intereses</span><b>{pesos(cuentas.costo)}</b></div>
                    <div className={`cifra${cuentas.utilidad < 0 ? " negativa" : ""}`}><span>Te quedaría</span><b>{pesos(cuentas.utilidad)}</b></div>
                    <div className="cifra"><span>Para no perder</span><b>{dec(cuentas.rendimientoEquilibrioTHa)} t/ha</b></div>
                  </div>

                  <div className="comparar" aria-label="Intereses con y sin pagar a tiempo">
                    <div className="barra"><span>Tasa {pct(TASA_BRUTA)}</span>
                      <div className="barra-pista"><div className="barra-relleno" style={{ width: "100%", background: "var(--chile)" }} /></div>
                      <span className="barra-valor">{pesos(credito.interesBruto)}</span></div>
                    <div className="barra destacada"><span>Pagando a tiempo {pct(TASA_NETA)}</span>
                      <div className="barra-pista"><div className="barra-relleno" style={{ width: `${(credito.interesNeto / credito.interesBruto) * 100}%` }} /></div>
                      <span className="barra-valor">{pesos(credito.interesNeto)}</span></div>
                    <p className="fuente">FIRA te devuelve 9 puntos de interés ({pesos(credito.bonificacion)}) solo si pagas a tiempo. El seguro tiene un apoyo de {seguro ? pct(seguro.porcentaje) : "—"} del monto ({pesos(seguro?.monto ?? 0)}). Pregunta la comisión de apertura.</p>
                  </div>

                  <div className={`alerta ${alerta}`} role="status">
                    {alerta === "bajo" && <>Para no perder necesitas {dec(cuentas.rendimientoEquilibrioTHa)} t/ha. En {perfil.municipio}, 3 de cada 4 años se ha cosechado más que eso.</>}
                    {alerta === "medio" && <>Para no perder necesitas {dec(cuentas.rendimientoEquilibrioTHa)} t/ha. En {perfil.municipio} eso se logra más o menos la mitad de los años. Piénsalo con calma.</>}
                    {alerta === "alto" && <>Cuidado: para no perder necesitas {dec(cuentas.rendimientoEquilibrioTHa)} t/ha, y en {perfil.municipio} la mitad de los años se cosecha menos de {dec(resumen?.p50 ?? 0)} t/ha. Pedir menos o no pedir también es una opción.</>}
                    {alerta === "sin-datos" && <>No hay datos suficientes de tu municipio para comparar tu cosecha.</>}
                    {resumen && <span className="fuente"> Superficie siniestrada en tu municipio: {pct(resumen.tasaSiniestro)} de lo sembrado (clima, plagas y enfermedades).</span>}
                  </div>

                  {sens && (
                    <details>
                      <summary>¿Y si el precio o la cosecha cambian?</summary>
                      <table className="tabla">
                        <thead><tr><th>Precio \ cosecha</th><th>20 % menos</th><th>Igual</th><th>20 % más</th></tr></thead>
                        <tbody>
                          {sens.map((fila, i) => (
                            <tr key={i}>
                              <td>{["20 % menos", "Igual", "20 % más"][i]}</td>
                              {fila.map((c, j) => <td key={j} className={`${c.utilidad < 0 ? "neg" : ""}${i === 1 && j === 1 ? " centro" : ""}`}>{pesos(c.utilidad)}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  )}
                </>
              )}
            </div>
          </section>

          <section className={`paso${lectura ? " hecho" : ""}`} aria-labelledby="p-freno">
            <span className="paso-num" aria-hidden>4</span>
            <h2 id="p-freno">¿Qué te frena?</h2>
            <p className="paso-sub">Tres preguntas para decidir con calma. No pedir también es una buena respuesta.</p>
            <div className="panel campos">
              <div className="campo"><span>¿Para qué usarías el dinero?</span>
                <div className="opciones" role="group">
                  {([["insumos", "Semilla, fertilizante o mano de obra"], ["maquinaria", "Renta de maquinaria"], ["otro", "Otro gasto"]] as const).map(([v, t]) => (
                    <button key={v} type="button" className="opcion" aria-pressed={uso === v} onClick={() => setUso(v)}>{t}</button>
                  ))}
                </div></div>
              <div className="campo"><span>¿Qué es lo que más te preocupa?</span>
                <div className="opciones" role="group">
                  {([["pagar", "No poder pagar"], ["cosecha", "Que se pierda la cosecha"], ["papeles", "Los papeles y trámites"], ["confianza", "No confío en el banco"], ["nada", "Nada en especial"]] as const).map(([v, t]) => (
                    <button key={v} type="button" className="opcion" aria-pressed={preocupacion === v} onClick={() => setPreocupacion(v)}>{t}</button>
                  ))}
                </div></div>
              <div className="campo"><span>Si la cosecha sale mal, ¿tienes con qué pagar? (ahorro, otro ingreso, apoyo de la familia)</span>
                <div className="opciones" role="group">
                  {([["si", "Sí"], ["no", "No"]] as const).map(([v, t]) => (
                    <button key={v} type="button" className="opcion" aria-pressed={respaldo === v} onClick={() => setRespaldo(v)}>{t}</button>
                  ))}
                </div></div>
              {lectura && (
                <div className={`lectura ${lectura.tipo}`} role="status">
                  <strong>{lectura.titulo}</strong>
                  <p>{lectura.texto}</p>
                  <p><b>Siguiente paso:</b> {lectura.siguiente}</p>
                </div>
              )}
              {!cuentas && <p className="vacio">Con tus cuentas del paso 3 la lectura toma en cuenta el riesgo de tu municipio.</p>}
              <p className="fuente">Inspirado en la entrevista motivacional que se usa en medicina para decisiones difíciles. Surco no decide por ti.</p>
            </div>
          </section>

          <section className={`paso${pasoHecho[3] ? " hecho" : ""}`} aria-labelledby="p3">
            <span className="paso-num" aria-hidden>5</span>
            <h2 id="p3">Junta tus papeles</h2>
            <p className="paso-sub">Solo si decidiste pedir. Marca lo que ya tienes: llevas {docsListos} de {checklist.length}.</p>
            <div className="panel">
              <ul className="checklist">
                {checklist.map((i) => (
                  <li key={i.id}>
                    <label>
                      <input type="checkbox" checked={Boolean(tengo[i.id])} onChange={(e) => setTengo((t) => ({ ...t, [i.id]: e.target.checked }))} />
                      <span>
                        {i.texto}
                        {i.estado === "por-confirmar" && <span className="marca">confirmar en tu CADER</span>}
                        {i.id === "aval" && !i.obligatorio && <span className="marca">no obligatorio</span>}
                        {i.nota && <small>{i.nota}</small>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="no-exigir">
                <h3>Esto no te lo pueden pedir</h3>
                <ul>{NO_PUEDEN_EXIGIR.map((n) => <li key={n}>{n}</li>)}</ul>
              </div>
              <p className="fuente">Fuente: Lineamientos de Cosechando Soberanía, FIRA, edición 8 (reportado; confirma en tu CADER).</p>
            </div>
          </section>

          <section className="paso" aria-labelledby="p5">
            <span className="paso-num" aria-hidden>6</span>
            <h2 id="p5">Llévate tu hoja</h2>
            <p className="paso-sub">Imprímela o guárdala en PDF y llévala a tu CADER o a tu intermediario. Tus datos declarados van marcados.</p>
            <div className="acciones">
              <button type="button" className="boton principal" onClick={() => window.print()} disabled={!cuentas}>Imprimir mi hoja</button>
              {!cuentas && <span className="vacio">Termina los pasos 1 y 4 para imprimirla.</span>}
            </div>
          </section>

          <section className="paso" aria-labelledby="p6">
            <h2 id="p6" style={{ fontSize: "1.25rem" }}>Impacto (escenario, no promesa)</h2>
            <p className="paso-sub">
              Lo que el programa le devuelve a cada productor que paga a tiempo: bonificación de interés más apoyo al seguro.
              Con tu monto: <b>{pesos(beneficio)}</b>. Ejemplo de referencia: $80,000 a 8 meses = {pesos(beneficioProductor(80000, 8))}.
            </p>
            <div className="panel">
              <table className="tabla">
                <thead><tr><th>Productores que usan la app</th><th>Si pide 1 %</th><th>Si pide 5 %</th><th>Si pide 10 %</th></tr></thead>
                <tbody>
                  {[1000, 10000, 50000].map((p) => (
                    <tr key={p}><td>{p.toLocaleString("es-MX")}</td>
                      {[0.01, 0.05, 0.1].map((a) => <td key={a}>{pesos(p * a * beneficioProductor(80000, 8))}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="fuente">Hipotético, no es evidencia: cuántos piden después de usar la app se mide en un piloto con registros del intermediario. Cálculo con el ejemplo de $80,000.</p>
            </div>
          </section>
        </main>

        <aside className="hoja-fija">
          <article className="hoja" aria-label="Tu hoja para el intermediario">
            <h2>Mi solicitud de avío</h2>
            <p className="hoja-sub">Preparada con Surco. No es una aprobación ni una oferta de crédito.</p>
            {!validacion.ok ? (
              <p className="vacio">Tu hoja se va llenando conforme avanzas.</p>
            ) : (
              <>
                <dl>
                  <dt>Cultivo</dt><dd>{perfil.cultivo.charAt(0).toUpperCase() + perfil.cultivo.slice(1)}<span className="declarado">declarado</span></dd>
                  <dt>Superficie</dt><dd>{dec(ha)} ha<span className="declarado">declarado</span></dd>
                  <dt>Municipio</dt><dd>{perfil.municipio}, Méx.</dd>
                  <dt>Programa SADER</dt><dd>{perfil.beneficiarioSader === true ? "Sí" : perfil.beneficiarioSader === false ? "No" : "Por confirmar"}<span className="declarado">declarado</span></dd>
                </dl>
                {cuentas && credito && (
                  <div className="hoja-seccion">
                    <h3>Lo que pediría</h3>
                    <dl>
                      <dt>Monto</dt><dd>{pesos(monto)}</dd>
                      <dt>Plazo</dt><dd>{meses} meses</dd>
                      <dt>Intereses si pago a tiempo</dt><dd>{pesos(credito.interesNeto)}</dd>
                      <dt>Total a pagar</dt><dd>{pesos(credito.totalNeto)}</dd>
                      <dt>Venta esperada</dt><dd>{pesos(cuentas.ingreso)}</dd>
                      <dt>Para no perder</dt><dd>{dec(cuentas.rendimientoEquilibrioTHa)} t/ha</dd>
                    </dl>
                  </div>
                )}
                {resumen && (
                  <div className="hoja-seccion">
                    <h3>Mi municipio, datos públicos (SIAP)</h3>
                    <dl>
                      <dt>Rendimiento típico</dt><dd>{dec(resumen.p25)}–{dec(resumen.p75)} t/ha</dd>
                      <dt>Precio medio rural reciente</dt><dd>{pesos(resumen.precioMedio)}/t</dd>
                      <dt>Superficie siniestrada</dt><dd>{pct(resumen.tasaSiniestro)}</dd>
                    </dl>
                  </div>
                )}
                <div className="hoja-seccion">
                  <h3>Papeles listos: {docsListos} de {checklist.length}</h3>
                  {checklist.some((i) => !tengo[i.id] && i.obligatorio) && (
                    <p style={{ margin: 0 }}>Me faltan: {checklist.filter((i) => !tengo[i.id] && i.obligatorio).map((i) => i.texto).join(", ")}.</p>
                  )}
                </div>
                <div className="hoja-seccion">
                  <h3>Preguntas para el intermediario</h3>
                  <ul>
                    <li>¿Cuál es la comisión de apertura y el costo total del crédito?</li>
                    <li>¿Me aplican la bonificación de Cosechando Soberanía si pago a tiempo?</li>
                    <li>¿Cuándo recibiría el dinero y en cuántas entregas?</li>
                  </ul>
                </div>
              </>
            )}
            <p className="hoja-aviso">Llevar esta hoja no implica que el crédito esté aprobado. Solo el intermediario puede revisar tu solicitud.</p>
            <p className="hoja-pie">Fuentes: {metaSiap.fuente}; {metaAgrocostos.fuente}; Lineamientos Cosechando Soberanía (FIRA, ed. 8). {esEjemplo && "Datos de ejemplo, sin verificar."}</p>
          </article>
        </aside>
      </div>

      <footer className="aviso no-imprimir">
        Surco orienta; no es una entidad financiera, no tramita créditos, no evalúa tu solvencia y no recomienda
        intermediarios. Las reglas del programa vienen de documentos públicos de SADER y FIRA y pueden cambiar: confírmalas en tu CADER.
        Datos: SIAP, FIRA Agrocostos e INEGI.
      </footer>
    </div>
  );
}

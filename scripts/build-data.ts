// Convierte los CSV oficiales de SIAP y FIRA Agrocostos en JSON compactos para la app.
// Uso: npx tsx scripts/build-data.ts
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { SerieAnual, ReferenciaCosto } from "../lib/tipos";

const RAW = join(process.cwd(), "data", "raw");
const OUT = join(process.cwd(), "data");

export function parseCsv(texto: string): Record<string, string>[] {
  const filas: string[][] = [];
  let campo = "", fila: string[] = [], comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo); campo = "";
      if (fila.length > 1 || fila[0] !== "") filas.push(fila);
      fila = [];
    } else campo += c;
  }
  if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
  const [enc, ...resto] = filas;
  return resto.map((f) => Object.fromEntries(enc.map((h, i) => [h.trim(), (f[i] ?? "").trim()])));
}

const num = (v: string | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Agrega filas de SIAP (varios ciclos/modalidades) en una serie por año. */
export function agregarMunicipioAnio(filas: Record<string, string>[]): SerieAnual[] {
  const porAnio = new Map<number, { s: number; c: number; x: number; vol: number; val: number }>();
  for (const f of filas) {
    const anio = num(f.Anio);
    const a = porAnio.get(anio) ?? { s: 0, c: 0, x: 0, vol: 0, val: 0 };
    a.s += num(f.Sembrada);
    a.c += num(f.Cosechada);
    a.x += num(f.Siniestrada);
    a.vol += num(f.Volumenproduccion);
    a.val += num(f.Valorproduccion);
    porAnio.set(anio, a);
  }
  return [...porAnio.entries()]
    .sort(([a], [b]) => a - b)
    .map(([anio, a]) => ({
      anio,
      sembrada: a.s,
      cosechada: a.c,
      siniestrada: a.x,
      rendimientoTHa: a.c > 0 ? a.vol / a.c : 0,
      precioPorTon: a.vol > 0 ? a.val / a.vol : 0,
    }));
}

function construirSiap() {
  const porMunicipio = new Map<string, Record<string, string>[]>();
  const anios: number[] = [];
  for (let y = 2015; y <= 2025; y++) {
    const ruta = join(RAW, `siap_${y}.csv`);
    if (!existsSync(ruta)) continue;
    anios.push(y);
    const filas = parseCsv(new TextDecoder("latin1").decode(readFileSync(ruta)));
    for (const f of filas) {
      if (f.Nomestado !== "México" || f.Nomcultivo?.replace(" Sin Um", "") !== "Maíz grano") continue;
      const m = f.Nommunicipio;
      if (!porMunicipio.has(m)) porMunicipio.set(m, []);
      porMunicipio.get(m)!.push(f);
    }
  }
  const municipios: Record<string, SerieAnual[]> = {};
  for (const [m, filas] of [...porMunicipio.entries()].sort(([a], [b]) => a.localeCompare(b, "es"))) {
    municipios[m] = agregarMunicipioAnio(filas);
  }
  writeFileSync(
    join(OUT, "siap-edomex-maiz.json"),
    JSON.stringify({
      meta: {
        fuente: "SIAP, Cierre de la producción agrícola, nivel municipal",
        url: "https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php",
        cultivo: "Maíz grano",
        estado: "México",
        anios,
        nota: "Agregado de todos los ciclos y modalidades. Siniestrada incluye clima, plagas y enfermedades.",
      },
      municipios,
    }),
  );
  return Object.keys(municipios).length;
}

function construirAgrocostos() {
  const filas = parseCsv(readFileSync(join(RAW, "agrocostos.csv"), "utf8").replace(/^﻿/, ""));
  const refs: ReferenciaCosto[] = filas
    .filter((f) => f.Estado === "MÉXICO" || f.Estado === "México" || f.Estado === "MEXICO")
    .filter((f) => f.Cultivo.includes("MAÍZ"))
    .map((f) => ({
      anio: num(f["Año"]),
      zona: f.Zona,
      tecnologia: f["Tecnología"],
      cultivo: f.Cultivo,
      rendimientoTHa: {
        pesimista: num(f["Rendimiento pesimista"]),
        probable: num(f["Rendimiento probable"]),
        optimista: num(f["Rendimiento optimista"]),
      },
      precioPorTon: num(f["Precio probable"]),
      ingresoPorHa: num(f["Ingreso probable"]),
      totalFinanciablePorHa: Math.round(num(f.TotalFinanciable)),
      tasaFira: num(f.TasaN1),
    }))
    .sort((a, b) => b.anio - a.anio);
  writeFileSync(
    join(OUT, "agrocostos-edomex-maiz.json"),
    JSON.stringify({
      meta: {
        fuente: "FIRA, Agrocostos (agrocosto_data_completa.csv)",
        url: "https://www.fira.gob.mx/Nd/Agrocostos.jsp",
        nota: "Referencia informativa de FIRA basada en pocas observaciones. Nivel estado y zona.",
      },
      referencias: refs,
    }),
  );
  return refs.length;
}

if (process.argv[1]?.endsWith("build-data.ts")) {
  console.log("municipios SIAP:", construirSiap());
  console.log("referencias Agrocostos:", construirAgrocostos());
}

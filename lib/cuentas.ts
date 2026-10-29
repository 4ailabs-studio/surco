import type { SerieAnual } from "./tipos";

export type EscenarioCuentas = {
  hectareas: number;
  rendimientoTHa: number;
  precioPorTon: number;
  costoDirectoPorHa: number;
  interes: number;
};

export function resultadoCuentas(e: EscenarioCuentas) {
  const ingreso = e.hectareas * e.rendimientoTHa * e.precioPorTon;
  const costo = e.hectareas * e.costoDirectoPorHa + e.interes;
  const utilidad = ingreso - costo;
  const rendimientoEquilibrioTHa = e.precioPorTon > 0 && e.hectareas > 0 ? costo / (e.precioPorTon * e.hectareas) : Infinity;
  return { ingreso, costo, utilidad, rendimientoEquilibrioTHa };
}

/** Filas: variación de precio; columnas: variación de rendimiento. */
export function sensibilidad(e: EscenarioCuentas, deltas: number[]) {
  return deltas.map((dp) =>
    deltas.map((dr) => {
      const precio = e.precioPorTon * (1 + dp);
      const rendimiento = e.rendimientoTHa * (1 + dr);
      return { precio: dp, rendimiento: dr, utilidad: resultadoCuentas({ ...e, precioPorTon: precio, rendimientoTHa: rendimiento }).utilidad };
    }),
  );
}

export function percentil(valores: number[], p: number): number {
  const v = [...valores].sort((a, b) => a - b);
  if (!v.length) return NaN;
  const pos = (v.length - 1) * p;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return v[lo] + (v[hi] - v[lo]) * (pos - lo);
}

export type ResumenSerie = { n: number; p25: number; p50: number; p75: number; tasaSiniestro: number; precioMedio: number; ultimoAnio: number };

export function resumenSerie(serie: SerieAnual[]): ResumenSerie | null {
  const validos = serie.filter((s) => s.rendimientoTHa > 0);
  if (validos.length < 3) return null;
  const rend = validos.map((s) => s.rendimientoTHa);
  const sembrada = serie.reduce((a, s) => a + s.sembrada, 0);
  const siniestrada = serie.reduce((a, s) => a + s.siniestrada, 0);
  const recientes = validos.slice(-3);
  return {
    n: validos.length,
    p25: percentil(rend, 0.25),
    p50: percentil(rend, 0.5),
    p75: percentil(rend, 0.75),
    tasaSiniestro: sembrada > 0 ? siniestrada / sembrada : 0,
    precioMedio: recientes.reduce((a, s) => a + s.precioPorTon, 0) / recientes.length,
    ultimoAnio: validos[validos.length - 1].anio,
  };
}

export function senalAlerta(rendEquilibrioTHa: number, r: ResumenSerie | null): "bajo" | "medio" | "alto" | "sin-datos" {
  if (!r || !Number.isFinite(rendEquilibrioTHa)) return "sin-datos";
  if (rendEquilibrioTHa <= r.p25) return "bajo";
  if (rendEquilibrioTHa <= r.p50) return "medio";
  return "alto";
}

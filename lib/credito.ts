// Reglas de Cosechando Soberanía según los lineamientos de FIRA (estado: Reportado; confirmar en el original).
export const TASA_BRUTA = 0.175;
export const BONIFICACION = 0.09;
export const TASA_NETA = 0.085;
export const SEGMENTOS = [30000, 80000, 250000, 1300000] as const;
const PORCENTAJE_SEGURO: Record<number, number> = { 30000: 0.08, 80000: 0.05, 250000: 0.04, 1300000: 0.025 };

function validarMonto(monto: number) {
  if (!Number.isFinite(monto) || monto <= 0) throw new Error("El monto debe ser mayor que 0");
}

/** Tope más pequeño que cubre el monto; null si excede $1,300,000. */
export function segmentoPara(monto: number): number | null {
  validarMonto(monto);
  return SEGMENTOS.find((s) => monto <= s) ?? null;
}

export function incentivoSeguro(monto: number) {
  const segmento = segmentoPara(monto);
  if (segmento === null) return null;
  const porcentaje = PORCENTAJE_SEGURO[segmento];
  return { segmento, porcentaje, monto: Math.round(monto * porcentaje * 100) / 100 };
}

export function calcularCredito({ monto, meses }: { monto: number; meses: number }) {
  validarMonto(monto);
  if (!Number.isFinite(meses) || meses <= 0) throw new Error("El plazo debe ser de al menos 1 mes");
  const f = meses / 12;
  const interesBruto = monto * TASA_BRUTA * f;
  const bonificacion = monto * BONIFICACION * f;
  const interesNeto = interesBruto - bonificacion;
  return {
    interesBruto,
    bonificacion,
    interesNeto,
    totalBruto: monto + interesBruto,
    totalNeto: monto + interesNeto,
  };
}

/** Lo que el programa le devuelve al productor que paga a tiempo: bonificación + incentivo de seguro. */
export function beneficioProductor(monto: number, meses: number): number {
  const { bonificacion } = calcularCredito({ monto, meses });
  return Math.round(bonificacion + (incentivoSeguro(monto)?.monto ?? 0));
}

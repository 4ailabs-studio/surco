import { describe, expect, test } from "vitest";
import { beneficioProductor, calcularCredito, incentivoSeguro, segmentoPara } from "@/lib/credito";
import { percentil, resultadoCuentas, resumenSerie, senalAlerta, sensibilidad } from "@/lib/cuentas";
import { checklistExpediente, evaluarElegibilidad, NO_PUEDEN_EXIGIR, validarPerfil } from "@/lib/expediente";
import { agregarMunicipioAnio } from "@/scripts/build-data";
import { municipiosEdomex, referenciaCosto } from "@/lib/datos";
import type { Perfil } from "@/lib/tipos";

describe("crédito", () => {
  test("segmentos", () => {
    expect(segmentoPara(25000)).toBe(30000);
    expect(segmentoPara(30000)).toBe(30000);
    expect(segmentoPara(30001)).toBe(80000);
    expect(segmentoPara(1300000)).toBe(1300000);
    expect(segmentoPara(1300001)).toBeNull();
  });
  test("incentivo de seguro", () => {
    expect(incentivoSeguro(80000)).toEqual({ segmento: 80000, porcentaje: 0.05, monto: 4000 });
    expect(incentivoSeguro(30000)?.porcentaje).toBe(0.08);
    expect(incentivoSeguro(200000)?.porcentaje).toBe(0.04);
    expect(incentivoSeguro(900000)?.porcentaje).toBe(0.025);
  });
  test("costo con y sin bonificación; ejemplo del spec", () => {
    const c = calcularCredito({ monto: 80000, meses: 8 });
    expect(c.interesBruto).toBeCloseTo(9333.33, 1);
    expect(c.bonificacion).toBeCloseTo(4800, 5);
    expect(c.interesNeto).toBeCloseTo(4533.33, 1);
    expect(beneficioProductor(80000, 8)).toBe(8800);
  });
  test("montos inválidos", () => {
    expect(() => calcularCredito({ monto: 0, meses: 8 })).toThrow("mayor que 0");
    expect(() => calcularCredito({ monto: NaN, meses: 8 })).toThrow();
    expect(() => calcularCredito({ monto: 1000, meses: 0 })).toThrow();
  });
});

describe("cuentas", () => {
  const e = { hectareas: 3, rendimientoTHa: 7, precioPorTon: 6700, costoDirectoPorHa: 29845, interes: 4000 };
  test("resultado", () => {
    const r = resultadoCuentas(e);
    expect(r.ingreso).toBe(140700);
    expect(r.costo).toBe(93535);
    expect(r.utilidad).toBe(47165);
    expect(r.rendimientoEquilibrioTHa).toBeCloseTo(4.6535, 3);
  });
  test("percentil y sensibilidad", () => {
    expect(percentil([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentil([1, 2, 3, 4], 0.25)).toBe(1.75);
    const s = sensibilidad(e, [-0.1, 0, 0.1]);
    expect(s).toHaveLength(3);
    expect(s[1][1].utilidad).toBe(47165);
  });
  test("alerta y datos insuficientes", () => {
    const corta = [{ anio: 2024, sembrada: 1, cosechada: 1, siniestrada: 0, rendimientoTHa: 4, precioPorTon: 6000 }];
    expect(resumenSerie(corta)).toBeNull();
    expect(senalAlerta(5, null)).toBe("sin-datos");
    const r = { n: 5, p25: 4, p50: 5, p75: 6, tasaSiniestro: 0, precioMedio: 6000, ultimoAnio: 2025 };
    expect(senalAlerta(3.9, r)).toBe("bajo");
    expect(senalAlerta(4.5, r)).toBe("medio");
    expect(senalAlerta(6, r)).toBe("alto");
  });
});

describe("expediente", () => {
  const base: Perfil = { cultivo: "maíz", hectareas: 3, estado: "México", municipio: "Toluca", beneficiarioSader: true, posesionPredio: true };
  test("elegibilidad nunca niega", () => {
    expect(evaluarElegibilidad(base).veredicto).toBe("cumple-basico");
    const sinPadron = evaluarElegibilidad({ ...base, beneficiarioSader: null });
    expect(sinPadron.veredicto).toBe("por-confirmar");
    expect(sinPadron.motivos.join(" ")).toMatch(/padrón/);
    expect(evaluarElegibilidad({ ...base, cultivo: "rosa" }).motivos.join(" ")).toMatch(/CADER/);
  });
  test("validación de hectáreas", () => {
    for (const h of [null, 0, -1, 10001]) expect(validarPerfil({ ...base, hectareas: h }).ok).toBe(false);
    expect(validarPerfil(base).ok).toBe(true);
  });
  test("checklist y aval", () => {
    const items = checklistExpediente(base);
    expect(items.filter((i) => i.estado === "reportado" && i.id !== "aval")).toHaveLength(11);
    expect(items.find((i) => i.id === "32d")?.estado).toBe("por-confirmar");
    expect(checklistExpediente({ ...base, edad: 71 }).find((i) => i.id === "aval")?.obligatorio).toBe(true);
    expect(checklistExpediente({ ...base, edad: 60 }).find((i) => i.id === "aval")?.obligatorio).toBe(false);
    expect(NO_PUEDEN_EXIGIR).toHaveLength(4);
  });
});

describe("datos", () => {
  test("agregado por año suma ciclos y acepta columna Precio antigua", () => {
    const s = agregarMunicipioAnio([
      { Anio: "2018", Sembrada: "10", Cosechada: "10", Siniestrada: "0", Volumenproduccion: "40", Valorproduccion: "160000", Precio: "4000" },
      { Anio: "2018", Sembrada: "5", Cosechada: "4", Siniestrada: "1", Volumenproduccion: "20", Valorproduccion: "80000" },
    ]);
    expect(s).toHaveLength(1);
    expect(s[0].sembrada).toBe(15);
    expect(s[0].siniestrada).toBe(1);
    expect(s[0].rendimientoTHa).toBeCloseTo(60 / 14, 5);
    expect(s[0].precioPorTon).toBe(4000);
  });
  test("JSON generados", () => {
    expect(municipiosEdomex().length).toBeGreaterThan(50);
    expect(municipiosEdomex()).toContain("Toluca");
    const r = referenciaCosto()!;
    expect(r.anio).toBe(2022);
    expect(r.zona).toBe("VALLES ALTOS");
    expect(r.rendimientoTHa.probable).toBe(7);
    expect(r.precioPorTon).toBe(6700);
  });
});

import { expect, test } from "vitest";
import { balanceDecision } from "@/lib/balance";

test("faltan respuestas", () => {
  expect(balanceDecision({ uso: null, preocupacion: "nada", respaldo: "si", alerta: "bajo" })).toBeNull();
});
test("no empuja a pedir cuando el riesgo es alto y no hay respaldo", () => {
  const r = balanceDecision({ uso: "insumos", preocupacion: "nada", respaldo: "no", alerta: "alto" })!;
  expect(r.tipo).toBe("pausa");
  expect(r.siguiente).toMatch(/No pedir/);
});
test("uso que no es productivo", () => {
  expect(balanceDecision({ uso: "otro", preocupacion: "nada", respaldo: "si", alerta: "bajo" })!.tipo).toBe("pausa");
});
test("distingue recursos de miedo", () => {
  expect(balanceDecision({ uso: "insumos", preocupacion: "pagar", respaldo: "no", alerta: "medio" })!.tipo).toBe("recursos");
  expect(balanceDecision({ uso: "insumos", preocupacion: "pagar", respaldo: "no", alerta: "bajo" })!.tipo).toBe("miedo");
  expect(balanceDecision({ uso: "insumos", preocupacion: "papeles", respaldo: "no", alerta: "medio" })!.tipo).toBe("miedo");
});
test("listo y pensar", () => {
  expect(balanceDecision({ uso: "maquinaria", preocupacion: "nada", respaldo: "si", alerta: "bajo" })!.tipo).toBe("listo");
  expect(balanceDecision({ uso: "insumos", preocupacion: "nada", respaldo: "si", alerta: "medio" })!.tipo).toBe("pensar");
});
test("ningún texto usa expresiones prohibidas", () => {
  const usos = ["insumos", "maquinaria", "otro"] as const;
  const preoc = ["pagar", "cosecha", "papeles", "confianza", "nada"] as const;
  const alertas = ["bajo", "medio", "alto", "sin-datos"] as const;
  for (const u of usos) for (const p of preoc) for (const s of ["si", "no"] as const) for (const a of alertas) {
    const r = balanceDecision({ uso: u, preocupacion: p, respaldo: s, alerta: a })!;
    expect(`${r.titulo} ${r.texto} ${r.siguiente}`).not.toMatch(/preaprobad|garantizad|te conviene|te alcanza/i);
  }
});

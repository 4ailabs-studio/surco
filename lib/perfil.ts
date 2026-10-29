import type { Perfil } from "./tipos";

const llave = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function aBooleano(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const t = llave(v);
    if (["si", "sí", "true", "yes"].includes(t)) return true;
    if (["no", "false"].includes(t)) return false;
  }
  return null;
}

function aNumero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const m = v.replace(",", ".").match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  }
  return null;
}

/** Convierte lo que extrae el modelo en un Perfil válido; lo dudoso queda en null con un aviso. */
export function normalizarPerfil(raw: unknown, municipios: string[]): { perfil: Partial<Perfil>; avisos: string[] } {
  const avisos: string[] = [];
  if (!raw || typeof raw !== "object") return { perfil: {}, avisos: ["No entendí los datos; llénalos a mano."] };
  const o = raw as Record<string, unknown>;
  const perfil: Partial<Perfil> = {};

  const ha = aNumero(o.hectareas);
  if (ha !== null && ha > 0 && ha <= 10000) perfil.hectareas = ha;
  else if (o.hectareas != null) avisos.push("No entendí cuántas hectáreas siembras.");

  if (typeof o.municipio === "string" && o.municipio.trim()) {
    const buscado = llave(o.municipio);
    const encontrado = municipios.find((m) => llave(m) === buscado) ?? municipios.find((m) => llave(m).startsWith(buscado) || buscado.startsWith(llave(m)));
    if (encontrado) perfil.municipio = encontrado;
    else avisos.push(`No encontré el municipio "${o.municipio}" en el Estado de México; elígelo de la lista.`);
  }

  const b = aBooleano(o.beneficiarioSader);
  if (b !== null) perfil.beneficiarioSader = b;
  const p = aBooleano(o.posesionPredio);
  if (p !== null) perfil.posesionPredio = p;
  const edad = aNumero(o.edad);
  if (edad !== null && edad >= 15 && edad <= 110) perfil.edad = Math.round(edad);
  if (typeof o.cultivo === "string" && o.cultivo.trim() && !llave(o.cultivo).includes("maiz"))
    avisos.push(`Mencionaste ${o.cultivo}; por ahora esta versión calcula solo maíz.`);

  return { perfil, avisos };
}

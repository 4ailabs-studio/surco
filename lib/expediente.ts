import type { Perfil } from "./tipos";

export const CULTIVOS_PROGRAMA = ["maíz", "frijol", "arroz", "café"];

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function validarPerfil(p: Perfil): { ok: boolean; errores: string[] } {
  const errores: string[] = [];
  if (p.hectareas === null || !Number.isFinite(p.hectareas) || p.hectareas <= 0 || p.hectareas > 10000)
    errores.push("Escribe cuántas hectáreas siembras (entre 0.1 y 10,000)");
  if (!p.municipio) errores.push("Elige tu municipio");
  return { ok: errores.length === 0, errores };
}

export function evaluarElegibilidad(p: Perfil): { veredicto: "cumple-basico" | "por-confirmar"; motivos: string[] } {
  const motivos: string[] = [];
  const cultivoOk = CULTIVOS_PROGRAMA.some((c) => sinAcentos(c) === sinAcentos(p.cultivo));
  if (cultivoOk) motivos.push(`Tu cultivo (${p.cultivo}) está entre los que menciona SADER para Cosechando Soberanía.`);
  else motivos.push("SADER menciona maíz, frijol, arroz y café; FIRA habla de unas 20 cadenas. Confirma tu cultivo en tu CADER.");
  if (p.beneficiarioSader === true) motivos.push("Dices que estás en un programa de SADER, que es requisito para participar.");
  else motivos.push("Hay que estar en el padrón de algún programa de SADER. Confírmalo en tu CADER.");
  if (p.posesionPredio === false) motivos.push("Te pedirán un documento de posesión del predio (propio, ejidal o rentado).");
  const veredicto = cultivoOk && p.beneficiarioSader === true ? "cumple-basico" : "por-confirmar";
  return { veredicto, motivos };
}

export type ItemExpediente = {
  id: string;
  texto: string;
  obligatorio: boolean;
  nota?: string;
  estado: "reportado" | "por-confirmar";
};

const BASE: [string, string, string?][] = [
  ["ine", "Identificación oficial (INE)"],
  ["domicilio", "Comprobante de domicilio"],
  ["curp", "CURP"],
  ["rfc", "RFC"],
  ["buro", "Consulta de buró de crédito", "La autoriza el intermediario."],
  ["sustrae", "Registro en SUSTRAE-FIRA", "Lo hace el intermediario con tus datos."],
  ["pld", "Formato de prevención de lavado de dinero"],
  ["capacidad", "Análisis de capacidad de pago", "Lo hace el intermediario; tu hoja le ayuda."],
  ["posesion", "Documento de posesión del predio"],
  ["solicitud", "Solicitud de crédito firmada"],
  ["seguro", "Seguro agrícola", "El programa paga una parte."],
];

export function checklistExpediente(p: Perfil): ItemExpediente[] {
  const items: ItemExpediente[] = BASE.map(([id, texto, nota]) => ({ id, texto, obligatorio: true, nota, estado: "reportado" }));
  items.push({
    id: "aval",
    texto: "Aval",
    obligatorio: (p.edad ?? 0) > 70,
    nota: p.edad === undefined ? "Solo lo pueden pedir si tienes más de 70 años." : (p.edad > 70 ? "Por tu edad, sí lo pueden pedir." : "Por tu edad no te lo pueden pedir."),
    estado: "reportado",
  });
  items.push({ id: "georef", texto: "Georreferencia de tus parcelas", obligatorio: true, estado: "por-confirmar" });
  items.push({ id: "32d", texto: "Estar al corriente con el SAT y el IMSS (opinión 32-D)", obligatorio: true, estado: "por-confirmar" });
  return items;
}

export const NO_PUEDEN_EXIGIR = ["Seguro de vida", "Garantía líquida (dinero en depósito)", "Tu casa u otro inmueble en garantía", "Prenda (maquinaria, animales u otros bienes)"];

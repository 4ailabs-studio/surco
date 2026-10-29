// Balance de decisión inspirado en la entrevista motivacional: no empuja a pedir,
// ayuda a distinguir si lo que frena es miedo, falta de recursos o riesgo real.
export type Uso = "insumos" | "maquinaria" | "otro";
export type Preocupacion = "pagar" | "cosecha" | "papeles" | "confianza" | "nada";
export type Respaldo = "si" | "no";
export type Alerta = "bajo" | "medio" | "alto" | "sin-datos";

export type Lectura = {
  tipo: "listo" | "miedo" | "recursos" | "pausa" | "pensar";
  titulo: string;
  texto: string;
  siguiente: string;
};

export function balanceDecision(r: { uso: Uso | null; preocupacion: Preocupacion | null; respaldo: Respaldo | null; alerta: Alerta }): Lectura | null {
  if (!r.uso || !r.preocupacion || !r.respaldo) return null;
  const { uso, preocupacion, respaldo, alerta } = r;

  if (uso === "otro")
    return {
      tipo: "pausa",
      titulo: "Este crédito no es para eso",
      texto: "El crédito de avío es para producir: semilla, fertilizante, mano de obra. Para otros gastos tendría otras condiciones.",
      siguiente: "Si de todos modos lo necesitas, pregunta en tu CADER por otras opciones antes de firmar.",
    };
  if (alerta === "alto" && respaldo === "no")
    return {
      tipo: "pausa",
      titulo: "Hoy el riesgo es alto",
      texto: "Para no perder necesitas cosechar más de lo que tu municipio logra la mitad de los años, y no tienes con qué pagar si la cosecha sale mal.",
      siguiente: "No pedir, o pedir menos, también es una buena decisión. Prueba con un monto menor en tus cuentas.",
    };
  if ((preocupacion === "pagar" || preocupacion === "cosecha") && alerta !== "bajo" && respaldo === "no")
    return {
      tipo: "recursos",
      titulo: "Lo que te frena son los recursos",
      texto: "Tu preocupación tiene base: los números quedan justos y no tienes un respaldo si algo sale mal.",
      siguiente: "Revisa el seguro agrícola (el programa paga una parte) y considera pedir un monto menor.",
    };
  if (preocupacion === "papeles" || preocupacion === "confianza")
    return {
      tipo: "miedo",
      titulo: "Lo que te frena es el trámite, no tus números",
      texto: preocupacion === "papeles"
        ? "Los papeles asustan, pero la lista es concreta y hay cosas que no te pueden pedir."
        : "Desconfiar es razonable. Conocer tus derechos y el costo real te protege.",
      siguiente: "Revisa la lista de papeles y lo que no te pueden pedir, y lleva tu hoja con tus preguntas.",
    };
  if ((preocupacion === "pagar" || preocupacion === "cosecha") && (alerta === "bajo" || respaldo === "si"))
    return {
      tipo: "miedo",
      titulo: "Los números están de tu lado",
      texto: alerta === "bajo"
        ? "Lo que te preocupa es normal, pero en tu municipio la mayoría de los años se cosecha más de lo que necesitas para pagar."
        : "Tienes un respaldo si algo sale mal, y eso baja el riesgo.",
      siguiente: "Si decides pedir, junta tus papeles y paga a tiempo para quedarte con la bonificación.",
    };
  if (preocupacion === "nada" && alerta === "bajo")
    return {
      tipo: "listo",
      titulo: "Estás listo para preparar tu solicitud",
      texto: "Tus números y tu situación respaldan la decisión.",
      siguiente: "Junta tus papeles y llévate tu hoja.",
    };
  return {
    tipo: "pensar",
    titulo: "Vale la pena pensarlo con calma",
    texto: "Tus números quedan justos. Platícalo con tu familia o con el técnico de tu CADER.",
    siguiente: "Prueba otros montos o plazos en tus cuentas antes de decidir.",
  };
}

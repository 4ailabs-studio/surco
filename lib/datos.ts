import siap from "@/data/siap-edomex-maiz.json";
import agro from "@/data/agrocostos-edomex-maiz.json";
import type { ReferenciaCosto, SerieAnual } from "./tipos";

const municipios = siap.municipios as Record<string, SerieAnual[]>;

export const metaSiap = siap.meta;
export const metaAgrocostos = agro.meta;

export function municipiosEdomex(): string[] {
  return Object.keys(municipios);
}

export function serieMunicipio(municipio: string): SerieAnual[] {
  return municipios[municipio] ?? [];
}

export function referenciaCosto(): ReferenciaCosto | null {
  return (agro.referencias as ReferenciaCosto[])[0] ?? null;
}

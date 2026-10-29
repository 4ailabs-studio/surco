import { expect, test } from "vitest";
import { normalizarPerfil } from "@/lib/perfil";

const M = ["Toluca", "Almoloya de Juárez", "Metepec"];

test("normaliza lo que extrae el modelo", () => {
  expect(normalizarPerfil({ hectareas: "3 hectáreas" }, M).perfil.hectareas).toBe(3);
  expect(normalizarPerfil({ municipio: "toluca" }, M).perfil.municipio).toBe("Toluca");
  expect(normalizarPerfil({ municipio: "almoloya de juarez" }, M).perfil.municipio).toBe("Almoloya de Juárez");
  expect(normalizarPerfil({ beneficiarioSader: "sí" }, M).perfil.beneficiarioSader).toBe(true);
});
test("lo dudoso queda vacío con aviso", () => {
  const neg = normalizarPerfil({ hectareas: -2 }, M);
  expect(neg.perfil.hectareas).toBeUndefined();
  expect(neg.avisos.length).toBe(1);
  const desconocido = normalizarPerfil({ municipio: "Guadalajara" }, M);
  expect(desconocido.perfil.municipio).toBeUndefined();
  expect(desconocido.avisos[0]).toMatch(/Guadalajara/);
  expect(normalizarPerfil(null, M).avisos.length).toBe(1);
  expect(normalizarPerfil({ beneficiarioSader: "quién sabe" }, M).perfil.beneficiarioSader).toBeUndefined();
});

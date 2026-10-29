import { afterEach, expect, test, vi } from "vitest";
import { fetchConReintento } from "@/lib/red";
import { siONo } from "@/components/voz";

afterEach(() => vi.unstubAllGlobals());

test("reintenta tras un 503 y devuelve la respuesta buena", async () => {
  const f = vi.fn()
    .mockResolvedValueOnce(new Response("x", { status: 503 }))
    .mockResolvedValueOnce(new Response("ok", { status: 200 }));
  vi.stubGlobal("fetch", f);
  const r = await fetchConReintento("http://x", {}, { esperaMs: 1 });
  expect(r.status).toBe(200);
  expect(f).toHaveBeenCalledTimes(2);
});

test("reintenta tras error de red y falla con mensaje claro si persiste", async () => {
  const f = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
  vi.stubGlobal("fetch", f);
  await expect(fetchConReintento("http://x", {}, { esperaMs: 1 })).rejects.toThrow("fetch failed");
  expect(f).toHaveBeenCalledTimes(2);
});

test("corta por tiempo agotado", async () => {
  vi.stubGlobal("fetch", (_u: string, init: RequestInit) => new Promise((_ok, mal) => {
    init.signal?.addEventListener("abort", () => mal(Object.assign(new Error("abort"), { name: "AbortError" })));
  }));
  await expect(fetchConReintento("http://x", {}, { intentos: 1, tiempoMs: 20 })).rejects.toThrow("Se tardó demasiado");
});

test("no reintenta un 400", async () => {
  const f = vi.fn().mockResolvedValue(new Response("x", { status: 400 }));
  vi.stubGlobal("fetch", f);
  const r = await fetchConReintento("http://x", {}, { esperaMs: 1 });
  expect(r.status).toBe(400);
  expect(f).toHaveBeenCalledTimes(1);
});

test("entiende sí y no dichos en voz", () => {
  expect(siONo("Sí, claro")).toBe(true);
  expect(siONo("si estoy en producción para el bienestar")).toBe(true);
  expect(siONo("No, ninguno")).toBe(false);
  expect(siONo("no sé")).toBeNull();
  expect(siONo("mmm")).toBeNull();
});

/**
 * fetch con límite de tiempo y reintentos ante fallas transitorias
 * (error de red, tiempo agotado, 429 o 5xx). Sirve en servidor y en navegador.
 */
export async function fetchConReintento(
  url: string,
  init: RequestInit = {},
  { intentos = 2, tiempoMs = 20000, esperaMs = 600 }: { intentos?: number; tiempoMs?: number; esperaMs?: number } = {},
): Promise<Response> {
  let ultimoError: unknown;
  for (let i = 0; i < intentos; i++) {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), tiempoMs);
    try {
      const r = await fetch(url, { ...init, signal: control.signal });
      clearTimeout(reloj);
      if ((r.status === 429 || r.status >= 500) && i < intentos - 1) {
        ultimoError = new Error(`Respuesta ${r.status}`);
        await new Promise((ok) => setTimeout(ok, esperaMs * (i + 1)));
        continue;
      }
      return r;
    } catch (e) {
      clearTimeout(reloj);
      ultimoError = (e as Error).name === "AbortError" ? new Error("Se tardó demasiado en responder.") : e;
      if (i < intentos - 1) await new Promise((ok) => setTimeout(ok, esperaMs * (i + 1)));
    }
  }
  throw ultimoError instanceof Error ? ultimoError : new Error("Falla de red.");
}

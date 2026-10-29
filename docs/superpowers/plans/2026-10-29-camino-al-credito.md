# Surco Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un tablero web móvil, con voz y asistente de IA, que acompaña a un pequeño productor de maíz del Estado de México a completar el trámite de un crédito de avío y le entrega una hoja de una página.

**Architecture:** Next.js (App Router, TypeScript) con un tablero de tarjetas en una sola página. Toda la lógica de negocio vive en funciones puras en `lib/` (probadas con Vitest); los datos de SIAP y FIRA Agrocostos se preprocesan a JSON estático; tres rutas de servidor (`/api/transcribe`, `/api/perfil`, `/api/asistente`) llaman a Mistral (Voxtral para voz, modelo de chat para perfil y asistente) con la clave solo en el servidor.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Vitest + @testing-library/react (jsdom), tsx para scripts de datos, API de Mistral.

**Spec:** `/Users/miguel/Hackaton-ADA/docs/superpowers/specs/2026-10-29-asistente-credito-productor-design.md`

## Global Constraints

- Raíz del proyecto: `/Users/miguel/Hackaton-ADA`. No es repositorio git: **omitir pasos de commit**.
- Interfaz y textos en español; mobile-first; el tablero se ve bien a 390 px de ancho.
- Alcance del prototipo: **maíz grano, Estado de México**; la arquitectura recibe `cultivo` y `estado` como parámetros.
- Parámetros del crédito: tasa bruta **17.5 %**, bonificación **9 puntos** si paga a tiempo, tasa neta **8.5 %**; segmentos de monto **$30,000 / $80,000 / $250,000 / $1,300,000**; incentivo de seguro **8 % / 5 % / 4 % / 2.5 %** respectivamente (segmento = tope más pequeño que cubre el monto).
- Ejemplo del spec que debe reproducirse: monto $80,000 durante 8 meses → bonificación $4,800 + incentivo de seguro $4,000 = **$8,800**.
- Vocabulario: "referencia" y "escenario". Prohibido en cualquier texto generado o mostrado: "preaprobado", "garantizado", "te conviene", "te alcanza", "te recomendamos [intermediario]", "tasa garantizada".
- Etiquetas de estado en la interfaz: datos **Verificado** (SIAP, Agrocostos, Censo), **Reportado** (lineamientos de FIRA) y **Ejemplo, sin verificar**; Agrocostos siempre muestra su año.
- No se guarda audio, transcripción ni perfil: ni en servidor ni en `localStorage`/`sessionStorage`. Aviso en pantalla de que el audio se envía a un tercero (Mistral) para transcribirlo.
- `MISTRAL_API_KEY` solo como variable de entorno del servidor, en `.env.local` (ignorado por git y nunca impresa ni incluida en el cliente).
- Todos los textos de cuentas se calculan con código; el modelo de lenguaje no calcula montos.

## Review Focus

1. Monto ≤ 0, vacío, NaN o mayor que $1,300,000: mensaje claro y sin `NaN` en pantalla (Task 3 y Task 6).
2. Municipio sin datos de SIAP o con menos de 3 años de observaciones: "sin datos suficientes", sin error (Task 4).
3. Micrófono denegado, grabación vacía o error de Mistral: cae a entrada de texto con mensaje (Task 8).
4. Pregunta fuera del corpus o que pide "preaprobado"/garantía de aprobación: responde "no lo sé" y remite a la CADER o al intermediario (Task 7).
5. Hectáreas faltantes, 0, negativas o absurdas (> 10,000), o cultivo distinto de maíz: validación visible y sin fila de Agrocostos inventada (Tasks 5 y 6).

---

### Task 1: Scaffold y herramientas de prueba

**Files:** Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.local`, `.gitignore`; Modify: nada previo.

- [ ] **Step 1:** En `/Users/miguel/Hackaton-ADA` (la carpeta ya contiene `.claude` y `docs`), ejecutar `npx create-next-app@latest . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm --yes`. Si se niega por archivos existentes, scaffoldear en un directorio temporal y mover los archivos sin tocar `.claude` ni `docs`.
- [ ] **Step 2:** `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom tsx`. Crear `vitest.config.ts` (entorno `jsdom`, alias `@` a la raíz) y el script `"test": "vitest run"`.
- [ ] **Step 3:** Crear `.env.local` con la línea `MISTRAL_API_KEY=...` tomada de `~/Sistema-consulta/.env` sin imprimir su valor (`grep '^MISTRAL_API_KEY=' ~/Sistema-consulta/.env > .env.local`). Confirmar que `.env*.local` está en `.gitignore`.
- [ ] **Step 4:** Verificación: `npm run build` termina sin error y `npm test` corre (sin pruebas todavía, código de salida 0 con `--passWithNoTests`).

### Task 2: Datos de SIAP y Agrocostos a JSON

**Files:** Create: `scripts/fetch-data.sh`, `scripts/build-data.ts`, `lib/datos.ts`, `data/siap-edomex-maiz.json`, `data/agrocostos-edomex-maiz.json`, `tests/datos.test.ts`.

**Interfaces — Produces:**
```ts
export type SerieAnual = { anio: number; sembrada: number; cosechada: number; siniestrada: number; rendimientoTHa: number; precioPorTon: number };
export type ReferenciaCosto = { anio: number; zona: string; tecnologia: string; rendimientoTHa: { pesimista: number; probable: number; optimista: number }; precioPorTon: number; ingresoPorHa: number; totalFinanciablePorHa: number; tasaFira: number };
export function municipiosEdomex(): string[];
export function serieMunicipio(municipio: string): SerieAnual[];
export function referenciaCosto(estado: string, cultivo: string): ReferenciaCosto | null; // la fila más reciente
export function agregarMunicipioAnio(filas: Record<string,string>[]): SerieAnual[]; // en scripts/build-data.ts, exportada
```

- [ ] **Step 1:** Test `agregarMunicipioAnio`: con dos filas del mismo municipio y año (ciclos distintos) suma `Sembrada`, `Cosechada`, `Siniestrada`, calcula `rendimientoTHa = Σ Volumenproduccion / Σ Cosechada` y `precioPorTon = Σ Valorproduccion / Σ Volumenproduccion`; con una fila de 2018 cuyo precio viene en la columna `Precio` (no `Preciomediorural`) produce el mismo resultado. Test de humo en los JSON: `municipiosEdomex().length > 50`, incluye `"Toluca"` con acentos correctos, y `referenciaCosto("México","MAÍZ ALTA PRODUCTIVIDAD")` devuelve `anio === 2022`, `zona === "VALLES ALTOS"`, `rendimientoTHa.probable === 7`, `precioPorTon === 6700`, `ingresoPorHa === 46900`.
- [ ] **Step 2:** Ejecutar `npm test -- datos` y confirmar que falla.
- [ ] **Step 3:** `scripts/fetch-data.sh` descarga a `data/raw/` (ignorado) los CSV de SIAP 2015–2025 desde `https://nube.agricultura.gob.mx/index.php?view=10AE434F-A2158368-A120BC5A-EDF4AFAA&ANIO=<año>` y `https://www.fira.gob.mx/Nd/agrocosto_data_completa.csv` (atajo: copiar los ya descargados de `/private/tmp/claude-501/-Users-miguel-Hackaton-ADA/b4a27e15-b840-444e-af7e-400e50956cd3/scratchpad/siap-serie/` y `.../agrocostos/csv/`). `scripts/build-data.ts` decodifica SIAP como latin-1 y Agrocostos como UTF-8, filtra `Nomestado = "México"` y `Nomcultivo = "Maíz grano"`, y emite ambos JSON. En Agrocostos filtra `Estado = "México"` y cultivo "MAÍZ ALTA PRODUCTIVIDAD". Implementar `lib/datos.ts` leyendo los JSON.
- [ ] **Step 4:** Ejecutar `npx tsx scripts/build-data.ts` y `npm test -- datos`; deben pasar.

### Task 3: Núcleo del crédito

**Files:** Create: `lib/credito.ts`, `tests/credito.test.ts`.

**Interfaces — Produces:**
```ts
export const TASA_BRUTA = 0.175, BONIFICACION = 0.09, TASA_NETA = 0.085;
export const SEGMENTOS = [30000, 80000, 250000, 1300000] as const;
export function segmentoPara(monto: number): number | null;
export function incentivoSeguro(monto: number): { segmento: number; porcentaje: number; monto: number } | null;
export function calcularCredito(p: { monto: number; meses: number }): { interesBruto: number; bonificacion: number; interesNeto: number; totalBruto: number; totalNeto: number };
export function beneficioProductor(monto: number, meses: number): number;
```
Lanzan `Error` con mensaje en español si `monto` no es un número finito > 0 o `meses` ≤ 0; `segmentoPara`/`incentivoSeguro` devuelven `null` si `monto > 1300000`.

- [ ] **Step 1:** Tests: `segmentoPara(25000)===30000`, `(30000)===30000`, `(30001)===80000`, `(1300000)===1300000`, `(1300001)===null`; `incentivoSeguro(80000)` → `{segmento:80000, porcentaje:0.05, monto:4000}` y porcentajes `0.08/0.04/0.025` para los otros segmentos; `calcularCredito({monto:80000,meses:8})` → `interesBruto≈9333.33`, `bonificacion===4800`, `interesNeto≈4533.33`; `beneficioProductor(80000,8)===8800`; `calcularCredito({monto:0,meses:8})`, `({monto:NaN,...})` y `({monto:1000,meses:0})` lanzan error.
- [ ] **Step 2:** `npm test -- credito` falla. **Step 3:** Implementar. **Step 4:** `npm test -- credito` pasa.

### Task 4: Cuentas, percentiles y señal de alerta

**Files:** Create: `lib/cuentas.ts`, `lib/estadistica.ts`, `tests/cuentas.test.ts`.

**Interfaces — Consumes:** `SerieAnual` (Task 2). **Produces:**
```ts
export type EscenarioCuentas = { hectareas: number; rendimientoTHa: number; precioPorTon: number; costoDirectoPorHa: number; interes: number };
export function resultadoCuentas(e: EscenarioCuentas): { ingreso: number; costo: number; utilidad: number; rendimientoEquilibrioTHa: number };
export function sensibilidad(e: EscenarioCuentas, deltas: number[]): { precio: number; rendimiento: number; utilidad: number }[][]; // filas = precio ±, columnas = rendimiento ±
export function percentil(valores: number[], p: number): number; // interpolación lineal, p en [0,1]
export function resumenSerie(serie: SerieAnual[]): { n: number; p25: number; p50: number; p75: number; tasaSiniestro: number; precioMedio: number } | null; // null si n < 3
export function senalAlerta(rendEquilibrioTHa: number, r: ReturnType<typeof resumenSerie>): "bajo" | "medio" | "alto" | "sin-datos";
```
- [ ] **Step 1:** Tests: con `{hectareas:3, rendimientoTHa:7, precioPorTon:6700, costoDirectoPorHa:29845, interes:4000}` → `ingreso===140700`, `costo===93535`, `utilidad===47165`, `rendimientoEquilibrioTHa≈4.6535`; `percentil([1,2,3,4,5],0.5)===3`; `percentil([1,2,3,4],0.25)===1.75`; `resumenSerie` con 2 años → `null` y `senalAlerta(5, null)==="sin-datos"`; con p25=4, p50=5: equilibrio 3.9 → `"bajo"`, 4.5 → `"medio"`, 6 → `"alto"`; `sensibilidad(e,[-0.1,0,0.1])` devuelve 3×3 y la celda central iguala `resultadoCuentas(e).utilidad`; `tasaSiniestro = Σsiniestrada/Σsembrada`.
- [ ] **Step 2–4:** fallar, implementar, pasar (`npm test -- cuentas`).

### Task 5: Perfil, elegibilidad y expediente

**Files:** Create: `lib/perfil.ts`, `lib/expediente.ts`, `tests/expediente.test.ts`.

**Interfaces — Produces:**
```ts
export type Perfil = { cultivo: string; hectareas: number | null; estado: string; municipio: string | null; beneficiarioSader: boolean | null; posesionPredio: boolean | null; edad?: number };
export function validarPerfil(p: Perfil): { ok: boolean; errores: string[] }; // hectáreas en (0, 10000]
export function evaluarElegibilidad(p: Perfil): { veredicto: "cumple-basico" | "por-confirmar"; motivos: string[] };
export type ItemExpediente = { id: string; texto: string; obligatorio: boolean; nota?: string; estado: "reportado" | "por-confirmar" };
export function checklistExpediente(p: Perfil): ItemExpediente[];
export const NO_PUEDEN_EXIGIR: string[]; // seguro de vida, garantía líquida, garantía inmueble, prenda
```
Cultivos del programa según SADER: maíz, frijol, arroz, café. El veredicto nunca niega: lo no confirmado es `"por-confirmar"` con motivo.

- [ ] **Step 1:** Tests: maíz + `beneficiarioSader:true` → `cumple-basico`; `beneficiarioSader:null` o `false` → `por-confirmar` con motivo que menciona "padrón"; cultivo "rosa" → `por-confirmar` con motivo que menciona "CADER"; `validarPerfil` rechaza `hectareas` null, 0, -1 y 10001; `checklistExpediente` incluye los 11 documentos base (INE, comprobante de domicilio, CURP, RFC, buró de crédito, SUSTRAE-FIRA, prevención de lavado de dinero, capacidad de pago, posesión del predio, solicitud, seguro agrícola), más georreferencia y art. 32-D con `estado:"por-confirmar"`; el aval tiene `obligatorio:true` solo con `edad > 70`; `NO_PUEDEN_EXIGIR` tiene 4 elementos.
- [ ] **Step 2–4:** fallar, implementar, pasar (`npm test -- expediente`).

### Task 6: Tablero y hoja imprimible

**Files:** Create: `components/Tablero.tsx`, `components/Tarjeta.tsx`, `components/ContextoCard.tsx`, `components/ParcelaCard.tsx`, `components/ElegibilidadCard.tsx`, `components/ExpedienteCard.tsx`, `components/CuentasCard.tsx`, `components/ImpactoCard.tsx`, `components/Hoja.tsx`, `components/Aviso.tsx`, `tests/tablero.test.tsx`; Modify: `app/page.tsx`, `app/globals.css` (estilos `@media print` que muestran solo `Hoja`).

**Interfaces — Consumes:** `Perfil`, `validarPerfil`, `evaluarElegibilidad`, `checklistExpediente`, `calcularCredito`, `beneficioProductor`, `resultadoCuentas`, `sensibilidad`, `resumenSerie`, `senalAlerta`, `serieMunicipio`, `municipiosEdomex`, `referenciaCosto`. **Produces:** `<Tablero />` (componente cliente; estado solo en memoria) con un botón "Cargar ejemplo" (maíz, 3 ha, municipio "Toluca", beneficiario sí) etiquetado "Ejemplo, sin verificar".

Tarjetas: **Contexto** (barras SVG de "Unidades con crédito, Censo 2022": Nacional 6.1, Estado de México 1.1, Campeche 7.9, Sinaloa 34.5); **Tu parcela** (formulario manual: hectáreas, municipio, beneficiario, posesión, edad; la voz se agrega en Task 8); **¿Califico?**; **Mi expediente** (checklist con casillas y la lista "Lo que no te pueden exigir"); **Mis cuentas** (monto editable, por defecto `hectareas × totalFinanciablePorHa`; barras de costo bruto 17.5 % vs neto 8.5 %; tabla de sensibilidad; badge de alerta; texto "Referencia de {año}, estado/zona, editable"; vía "no pedir"); **Impacto (escenario)** (fórmula P × a × B, ejemplo de $8,800, tabla de *a* ∈ {1 %, 5 %, 10 %} × P ∈ {1,000; 10,000; 50,000} etiquetada "hipotético, no es evidencia"); **Llévalo** (botón que llama `window.print()` sobre `Hoja`, con datos públicos y declarados etiquetados, fuentes y aviso de alcance). Usar la skill `frontend-design:frontend-design` para el estilo.

- [ ] **Step 1:** Tests de componente (Testing Library): (a) tras "Cargar ejemplo", el tablero muestra el monto 89,535, la etiqueta "Ejemplo, sin verificar" y ningún texto `NaN` ni `undefined`; (b) con monto `0` muestra "El monto debe ser mayor que 0" y no calcula; (c) con monto 1,400,000 muestra que excede el tope de $1,300,000; (d) con hectáreas vacías muestra el error de `validarPerfil`; (e) un municipio sin serie muestra "sin datos suficientes"; (f) ningún texto renderizado contiene las expresiones prohibidas.
- [ ] **Step 2:** `npm test -- tablero` falla. **Step 3:** Implementar. **Step 4:** pasa; además `npm run dev` y revisar a 390 px.

### Task 7: Asistente con citas

**Files:** Create: `corpus/*.md`, `lib/corpus.ts`, `lib/recuperacion.ts`, `lib/mistral.ts`, `lib/asistente.ts`, `app/api/asistente/route.ts`, `components/AsistenteCard.tsx`, `tests/asistente.test.ts`, `tests/asistente.eval.ts`; Modify: `components/Tablero.tsx` (agregar la tarjeta).

**Interfaces — Produces:**
```ts
export type Pasaje = { id: string; titulo: string; url: string; estado: "verificado" | "reportado"; texto: string };
export function cargarCorpus(): Pasaje[];
export function buscarPasajes(pregunta: string, pasajes: Pasaje[], k: number): { pasaje: Pasaje; score: number }[];
export function sanitizar(texto: string): { ok: boolean; texto: string }; // ok:false si contiene una expresión prohibida
export type Respuesta = { texto: string; citas: { id: string; url: string }[]; noSe: boolean };
export function responder(pregunta: string, deps: { chat: (msgs: { role: string; content: string }[]) => Promise<string> }): Promise<Respuesta>;
```
Corpus (un `.md` por pasaje, con `id`, `url`, `estado`): requisitos máximos, lo que no pueden exigir, aval a mayores de 70 años, tasa y bonificación, incentivo de seguro por segmento, ruta CADER/intermediario, tiempos y cuellos de botella, elegibilidad según SADER y FIRA, montos por segmento, alcance 2026, aviso de Agrocostos. Redactarlos desde la sección 3 del spec, conservando sus etiquetas "Reportado"/"Verificado". `responder` busca pasajes; si el mejor `score` < umbral definido en el test, devuelve `noSe:true` **sin llamar** a `deps.chat`; si no, llama a `chat` con un mensaje de sistema que obliga a responder solo con los pasajes y a citar `[id]`, y pasa el resultado por `sanitizar`.

- [ ] **Step 1:** Tests: `buscarPasajes("¿qué documentos me piden?", …)[0].pasaje.id` es el de requisitos; `responder("¿cuál es la capital de Francia?", {chat: spy})` devuelve `noSe:true` y `spy` no fue llamado; `responder("dime si estoy preaprobado", …)` devuelve `noSe:true` y remite a la CADER o al intermediario; con `chat` que devuelve "estás preaprobado", `sanitizar` marca `ok:false` y la respuesta final es `noSe:true`; las citas devueltas existen en el corpus. `tests/asistente.eval.ts` define 20 preguntas derivadas del corpus (15 con respuesta en el corpus y las `id` esperadas, 5 fuera de corpus que esperan `noSe:true`).
- [ ] **Step 2:** falla. **Step 3:** Implementar `lib/mistral.ts` con `chatMistral(msgs, {json?: boolean})` (`POST https://api.mistral.ai/v1/chat/completions`, `Authorization: Bearer`, `model: "mistral-small-latest"`, `temperature: 0`) y la ruta que devuelve `Respuesta`; si Mistral falla, responde `noSe:true` con aviso. **Step 4:** pasa; humo manual: hacer una pregunta real desde el tablero y ver que cita.

### Task 8: Voz y extracción de perfil

**Files:** Create: `app/api/transcribe/route.ts`, `app/api/perfil/route.ts`, `components/VozCard.tsx`, `tests/voz.test.ts`; Modify: `lib/mistral.ts` (agregar `transcribirVoxtral`), `lib/perfil.ts` (agregar `normalizarPerfil`), `components/ParcelaCard.tsx`.

**Interfaces — Produces:**
```ts
export function transcribirVoxtral(audio: Blob, nombre: string): Promise<string>; // POST https://api.mistral.ai/v1/audio/transcriptions, header x-api-key, model voxtral-mini-latest
export function normalizarPerfil(raw: unknown, municipios: string[]): { perfil: Perfil; avisos: string[] };
```
`/api/perfil` pide al modelo (modo JSON) extraer `{cultivo, hectareas, municipio, beneficiarioSader, posesionPredio, edad}` del texto y pasa el resultado por `normalizarPerfil`.

- [ ] **Step 1:** Tests de `normalizarPerfil`: `{hectareas:"3 hectáreas"}` → `3`; `{hectareas:-2}` → `null` con aviso; `{municipio:"toluca"}` → `"Toluca"` (sin distinguir mayúsculas ni acentos); municipio desconocido → `null` con aviso; booleanos desconocidos → `null`; entrada no objeto → perfil con valores `null` y aviso. Test de componente: si `getUserMedia` rechaza o la transcripción llega vacía, `VozCard` muestra el mensaje y deja visible el campo de texto.
- [ ] **Step 2:** falla. **Step 3:** Implementar; `VozCard` graba con `MediaRecorder`, envía el audio a `/api/transcribe`, muestra el texto editable, llama a `/api/perfil` y llena `ParcelaCard`; incluye el aviso de envío a un tercero y el botón "Escribir en lugar de hablar". **Step 4:** pasa; humo manual hablando con el micrófono real en Chrome y, si Voxtral rechaza el formato, convertir el audio antes de enviarlo.

### Task 9: README y verificación final

**Files:** Create: `README.md`.

- [ ] **Step 1:** Redactar `README.md` con el problema, la tabla de datos de la sección 7 del spec (fuente, uso, estado, advertencias de datos), el aviso de alcance, cómo correr (`npm i`, `npm run dev`, variable `MISTRAL_API_KEY`) y la declaración de conflicto de interés.
- [ ] **Step 2:** Ejecutar `npm test` (todo pasa) y `npm run build` (sin errores).
- [ ] **Step 3:** Ensayar el guion de 3 minutos de la sección 10 del spec con "Cargar ejemplo" y luego con voz; verificar que "Imprimir" muestra solo la hoja de una página.

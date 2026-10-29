# Surco

**Decide con calma si pedir un crédito para tu siembra, con los números de tu municipio, y llega preparado.**

Hackatón SECIHTI–CIDE con NVIDIA, CDMX, 29 de octubre de 2026. Track: Campo inteligente.

**Pruébalo:** https://surco-ivory.vercel.app (elige "Empezar sin voz" para contestar con botones, o "Empezar con asistente de voz"). Ejemplo sugerido: maíz, 3 hectáreas, Toluca.

![Pantalla de inicio de Surco: "Hola, soy Surco", con las opciones de empezar con asistente de voz o sin voz](docs/img/inicio.png)

## Equipo

- Dr. Miguel Ojeda Rios, médico.
- Beatriz Hernández Alonso, maestra en Economía (UNAM).
- Jonathan Ávila Pineda, ingeniero industrial (ITESM).
- Gabriel Castillo Suárez, estudiante de Computación (UNAM).

## El problema

- Solo **6.1 %** de las unidades de producción agropecuaria obtuvo crédito en 2022, y **1.9 %** tuvo seguro. En el Estado de México, el crédito fue de **1.1 %**; en Sinaloa, **34.5 %** (INEGI, Censo Agropecuario 2022).
- Pocos piden, pero casi todos los que piden obtienen: en 2019, **9.4 %** de las unidades solicitó crédito y **8.4 %** lo obtuvo (INEGI, ENA 2019). La lectura de que cerca de 9 de cada 10 solicitantes lo consiguen es un cálculo nuestro con esas dos cifras.
- Quienes no piden dicen que es por intereses altos (64.3 %), muchos requisitos (49.6 %) y no querer endeudarse (45.4 %) (INEGI, ENA 2014; respuesta múltiple).

El cuello de botella no es el banco: es decidir y prepararse.

## Qué hace Surco

Acompaña al pequeño productor (o al técnico que lo atiende) con **una pregunta por pantalla**. Contesta con botones grandes, con su voz, o con un **asistente de voz** que lee cada pregunta en voz alta y lo escucha. El "crédito de avío" es el crédito para la siembra: cubre semilla, fertilizante y mano de obra de un ciclo, y se paga con la cosecha.

1. **Su parcela:** qué siembra, cuántas hectáreas, en qué municipio y si está en un programa de SADER. La voz la transcribe Voxtral (Mistral) y Mistral Small extrae los datos; un normalizador valida lo dudoso.
2. **¿Calificas?** con las reglas publicadas de Cosechando Soberanía. Nunca dice "no": dice qué confirmar en la CADER y muestra otras rutas.
3. **Tus cuentas** con el costo de FIRA Agrocostos y el rendimiento y precio reales de su municipio (SIAP): cuánto le quedaría, cuánto necesita cosechar para no perder y el costo con y sin bonificación.
4. **¿Qué te frena?**: un balance de decisión inspirado en la entrevista motivacional que distingue miedo, falta de recursos o riesgo real. No pedir también es una buena respuesta.
5. **Sus papeles, solo si decide pedir:** la tierra, el aval y la lista de documentos, incluido lo que no le pueden exigir. Van al final para que no sean un obstáculo.
6. **Su hoja:** una página para la CADER o el intermediario, con los datos declarados marcados.

![Una pregunta por pantalla, con botones Sí, No y No sé, y el micrófono para responder con la voz](docs/img/pregunta.png)

La versión anterior, en forma de tablero, sigue disponible en `/tablero`.

### El caso que muestra para qué sirve

Con 3 hectáreas de maíz en Toluca, la referencia de FIRA supone 7 t/ha, pero SIAP registra 4.3 a 4.6 t/ha en ese municipio. Con el rendimiento real, después de pagar el crédito le quedarían **$1,721**, y necesita cosechar **4.4 t/ha** para no perder. Surco lo muestra antes de que el productor firme.

![Pantalla "Tus cuentas": te quedaría $1,721 después de pagar; pedirías $89,535, venderías $96,330 y necesitas 4.4 t/ha para no perder](docs/img/cuentas.png)

![Lectura final: "Lo que te frena son los recursos", con la pregunta de si quiere preparar su solicitud o por ahora no](docs/img/que-te-frena.png)

**Lo que no hace:** no tramita créditos, no evalúa solvencia, no promete aprobación, no recomienda intermediarios y no guarda audio ni datos personales. Los cálculos los hace el código; la IA solo entiende la voz.

## Datos y trazabilidad

| Fuente | Uso | Estado |
|---|---|---|
| SIAP, Cierre de la producción agrícola, nivel municipal, CSV 2015–2025 ([datos abiertos](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php)) | Rendimiento, precio medio rural y superficie siniestrada de maíz grano por municipio del Estado de México | Verificado: descargado y procesado; 124 municipios |
| FIRA, Agrocostos (`agrocosto_data_completa.csv`, [portal](https://www.fira.gob.mx/Nd/Agrocostos.jsp)) | Costo por hectárea de referencia | Verificado: referencia de 2022, zona Valles Altos, maíz de temporal; FIRA advierte que viene de pocas observaciones |
| INEGI, Censo Agropecuario 2022 y ENA 2019 | Crédito y seguro; contexto | Verificado |
| INEGI, ENA 2014 | Motivos para no solicitar crédito | Reportado |
| FIRA, Lineamientos Cosechando Soberanía, edición 8 ([página](https://www.fira.gob.mx/Nd/fondoCosechandoSoberania.jsp)) | Requisitos, tasa de hasta 17.5 % con bonificación de 9 puntos, incentivo al seguro por segmento | Reportado: confirmar en el original |
| SADER, [Cosechando Soberanía](https://www.gob.mx/agricultura/acciones-y-programas/cosechando-soberania) | Cultivos elegibles y montos máximos | Verificado |

**Advertencias:** en SIAP, la columna de precio se llama `Precio` hasta 2020 y `Preciomediorural` desde 2021; los archivos de 2020 y 2021 tienen menos filas. SIAP mezcla productores de todos los tamaños y sus cifras son anuales y municipales. "Siniestrada" incluye clima, plagas y enfermedades. Los archivos originales van en `data/raw/` (fuera de git); `npm run data` regenera `data/*.json`.

## Impacto (escenario, no promesa)

Beneficio por productor que paga a tiempo = bonificación de 9 puntos de interés + apoyo al seguro. Ejemplo: $80,000 a 8 meses = $4,800 + $4,000 = **$8,800**. Cuántos productores piden después de usar Surco es un supuesto que se mide en un piloto con técnicos de la CADER, usando registros del intermediario.

## Cómo correrlo

```bash
npm install
# crear .env.local con MISTRAL_API_KEY=... (solo para la voz)
npm run build && npm run start -- -p 3210
npm test   # 25 pruebas
```

Sin clave de Mistral todo funciona excepto la voz; "Cargar ejemplo" funciona sin conexión.

## Estructura

- `components/` tablero y voz · `lib/` reglas del crédito, cuentas, expediente, balance de decisión, perfil y cliente de Mistral · `app/api/` rutas de transcripción y extracción · `data/` datos procesados · `scripts/` procesamiento de datos · `tests/` pruebas · `docs/` diseño, plan y flujo del equipo.

## Ruta de mejora

1. Piloto medido con técnicos de la CADER.
2. **Surco en vivo:** agente de voz en tiempo real con Gemini Live API que conversa con el productor renuente con entrevista motivacional, sin empujarlo a endeudarse, y calcula con las reglas de Surco. Detalle en [docs/surco-en-vivo.md](docs/surco-en-vivo.md).
3. Asistente con citas, entrenado solo en documentos de FIRA y SADER.
4. Canal por WhatsApp; datos de Agrocostos 2024–2026; más cultivos y estados.

## Aviso

Surco orienta; no es una entidad financiera. Las reglas del programa pueden cambiar: confírmalas en tu CADER. Conflicto de interés: el equipo no vende servicios a través de Surco.

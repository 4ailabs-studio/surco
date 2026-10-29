# Surco (antes "Camino al Crédito")

**Asistente de IA por voz que ayuda al pequeño productor a completar el trámite de un crédito de avío, aprendiendo mientras prepara su solicitud**

- **Hackatón:** Hackatón 2026 SECIHTI–CIDE (con NVIDIA), CDMX, 29-oct-2026. Track: **Campo inteligente**.
- **Estado del documento:** Borrador v2, con la investigación de proceso, motivos y evidencia incorporada.
- **Convención de estados:** **Verificado** = el autor descargó o leyó la fuente. **Reportado** = lo leyó un agente de investigación; el autor no ha confirmado el original y debe hacerlo antes de presentarlo como hecho. **Supuesto** = decisión o estimación declarada. **[PENDIENTE]** = falta resolver.
- **Nombres alternativos (sugerencia):** *Primer Avío*, *Aprende tu Avío*.

---

## 1. Resumen

Según el Censo Agropecuario 2022, solo 6.1 % de las unidades de producción obtuvo crédito. Existe una oferta pública de crédito de avío con bonificación de tasa (Cosechando Soberanía, SADER y FIRA), pero su alcance es pequeño frente al universo de productores. La investigación de este proyecto indica que informar en abstracto no basta: los productores que no solicitan citan sobre todo las tasas, los requisitos y no querer endeudarse. Por eso la app **no es un curso**: acompaña al productor, por voz y desde el celular, a **completar el trámite**. Le dice si califica, qué le piden y qué no le pueden exigir, cuánto podría pedir, cuánto le costaría de verdad, y le entrega una hoja de una página para llevar a la CADER o a un intermediario financiero. El aprendizaje ocurre al hacerlo, con un asistente que responde con citas oficiales.

**No** tramita créditos, no evalúa solvencia, no promete aprobación, no recomienda un intermediario concreto y no guarda datos personales.

## 2. Por qué encaja en el hackatón

| Criterio | Cómo lo cubre |
|---|---|
| Prototipo funcional (interfaz y flujo demostrables) | Flujo de 5 etapas con voz, reglas del programa, calculadora y hoja imprimible |
| Demostración de hasta 3 minutos | Guion en la sección 10 |
| Datos públicos con trazabilidad | SIAP, INEGI, FIRA y SADER; tabla en la sección 7 |
| Impacto económico | Beneficio por productor definido por reglas del programa, sección 8 |
| Ruta de mejora | Sección 11 |

El organizador describió el objetivo del track: que el productor, con un teléfono o una tablet, pueda llevar a una institución financiera datos de cuánto produce y cuánto puede ganar.

## 3. Problema y evidencia

**Verificado (Censo Agropecuario 2022, INEGI)**
- De 4,629,134 unidades de producción activas, 284,114 (6.1 %) obtuvieron crédito y 89,860 (1.9 %) seguro. En 2007 eran 3.9 % y 0.6 %.
- Por estado: Estado de México 1.1 %, Campeche 7.9 %, Sinaloa 34.5 %. Las diferencias reflejan también tamaño de unidad y cultivo.
- ENA 2019: 9.4 % solicitó crédito y 8.4 % obtuvo (la solicitud era 12.6 % en 2014 y 10.9 % en 2017). Lectura del autor: pocos solicitan y casi todos los que solicitan obtienen (cálculo propio, bases de encuestas distintas).
- Alcance de Cosechando Soberanía (FIRA, 2026): 5,316 operaciones por $2,465.7 millones y 11,392 acreditados finales; el esquema ampliado benefició a 9,451 acreditados.

**Reportado: por qué no piden (ENA 2014, entre quienes no solicitaron, 87.3 %; multirespuesta y autorreportado)**
Intereses altos 64.3 %, muchos requisitos 49.6 %, no quiere endeudarse 45.4 %, no le interesa 39.8 %, desconfía de los bancos 27.6 %, sin sucursal cerca 19.7 %. La encuesta no incluía la opción "no sabía cómo". Son datos de 2014; no se encontraron motivos en el Censo 2022 ni en las ENA 2017 y 2019.

**Reportado: evidencia de educación financiera.** Una revisión de 76 experimentos (Kaiser et al., 2022) halla efectos de unos +0.2 desviaciones estándar en conocimiento y +0.1 en conductas; en México (Bruhn et al., 2013) casi nadie tomó el curso y no cambió el endeudamiento; un subsidio pequeño pesó más que la educación en otro estudio (Cole, Sampson y Zia, 2011). No se encontró un experimento de una app de orientación de crédito agrícola.

**Implicaciones de diseño:** (1) no se hace educación genérica; (2) la app reduce la carga del trámite y muestra el costo real y el riesgo; (3) no puede bajar las tasas ni quitar requisitos, y no promete lo contrario.

**Reportado: proceso real (Lineamientos Cosechando Soberanía, edición 8, FIRA, actualizados el 20-oct-2026)**
- **Ruta:** la CADER o el DDR arma el proyecto y revisa el expediente; presta un intermediario (banco, caja o parafinanciera) con fondeo y garantía de FIRA. Avío de hasta 2 años.
- **Requisitos máximos exigibles (créditos de hasta $300 mil):** INE, comprobante de domicilio, CURP, RFC, buró de crédito, registro SUSTRAE-FIRA, prevención de lavado de dinero, capacidad de pago, posesión del predio, solicitud y seguro agrícola. Aval solo si el productor tiene más de 70 años. **No pueden exigir** seguro de vida ni garantía líquida, inmueble o prenda. Además se mencionan georreferencia de parcelas y estar al corriente fiscal y en el IMSS (art. 32-D), que no aparece en la tabla de requisitos máximos.
- **Costo:** tasa de hasta 17.5 %; FIRA bonifica 9 puntos al liquidar a tiempo, por lo que el costo neto es de 8.5 % solo si se paga a tiempo. Incentivo para el seguro: 8, 5, 4 y 2.5 % del monto según segmento ($30 mil, $80 mil, $250 mil y $1.3 millones). La comisión de apertura varía (un caso consultado: 2 % más $5,000 y aval).
- **Tiempos:** sin plazo oficial; FIRA reconoce cuellos de botella.
- **Contradicciones:** SADER publica "tasa máxima de 9 %"; es compatible con la bonificación de 9 puntos, pero hay que confirmarlo. Elegibilidad: SADER menciona cuatro cultivos, leche y pesca; FIRA, unas 20 cadenas. El monto de leche difiere entre fuentes. **[PENDIENTE]** confirmar contra el texto original de los lineamientos.

## 4. Propuesta de valor, usuarios y alcance

**Usuario principal:** pequeño productor de maíz o frijol, con celular, en español. El 26.8 % de los productores tiene más de 65 años (Censo 2022) y el 75.2 % de la población rural usa internet (ENDUTIH 2025).

**Usuario secundario:** técnico o promotor que acompaña a productores.

**Alcance del prototipo (decisión del autor):** maíz grano en el Estado de México (acceso a crédito de 1.1 %), con arquitectura extensible a otros cultivos y estados.

**Fuera de alcance:** tramitación, scoring, guardar datos personales, recibir documentos, recomendar intermediarios, lenguas indígenas.

## 5. Experiencia (5 etapas)

1. **Cuéntanos de tu parcela (voz).** La transcripción se convierte en un perfil: cultivo, hectáreas, municipio, si es beneficiario de programas de SADER (se pregunta, no se verifica) y si tiene posesión del predio.
2. **¿Califico?** Cuatro preguntas (cultivo, municipio, padrón de SADER, hectáreas) y la respuesta muestra segmento, tope, incentivo de seguro, fecha de los lineamientos y fuente.
3. **Mi expediente.** Lista de documentos y pasos, y "lo que no te pueden exigir", por voz o texto, con la ruta hacia la CADER o un intermediario.
4. **Mis cuentas.** Rango de monto = cuota de crédito por hectárea de referencia (FIRA Agrocostos) × hectáreas, contrastado con rendimiento y precio medio rural de SIAP en su municipio (percentiles de varios años y proporción siniestrada). Muestra el costo real: tasa bruta 17.5 %, tasa neta 8.5 % si paga a tiempo, seguro y comisión por confirmar, total a pagar, punto de equilibrio y sensibilidad. Incluye una señal de alerta cuando el punto de equilibrio exige un rendimiento por encima de lo que el municipio logra con frecuencia, y una vía "no pedir" sin presión.
5. **Llévalo.** Hoja de una página con datos públicos y datos declarados claramente etiquetados, fuentes, preguntas para el intermediario y aviso de alcance.

El asistente de IA acompaña todas las etapas para preguntas libres.

## 6. Diseño de la IA

- **Separación de funciones:** el cálculo lo hace código determinista; el modelo de lenguaje explica y conversa. La IA no calcula montos.
- **Base documental cerrada:** el asistente responde solo con el corpus verificado (lineamientos y páginas de FIRA y SADER, a completar), con cita obligatoria. Sin base, responde "no lo sé" y remite a la CADER o al intermediario.
- **Lenguaje y reglas de seguridad (Reportado; no es asesoría legal):** hablar de "referencia" y "escenario". Evitar: "preaprobado", tasa garantizada, rankings pagados, comisión por canalizar, recibir documentos y recomendar un intermediario concreto.
- **Voz:** entrada con Voxtral, reutilizando el flujo de transcripción existente (`Sistema-consulta/scripts/transcribe_audio.cjs`). La voz grabada es dato personal: no se guarda.
- **Evaluación:** 20 preguntas de prueba derivadas del corpus (respuesta esperada = texto citado), con preguntas trampa (requisitos inventados, garantía de aprobación, montos fuera de rango); las preguntas fuera del corpus esperan "no lo sé".

## 7. Datos y trazabilidad (base del README)

| Fuente | Uso | Estado |
|---|---|---|
| SIAP, Cierre de la producción agrícola, nivel municipal, CSV por año (1980–2025) — nube.agricultura.gob.mx/datosAbiertos/Agricola.php | Rendimiento, precio medio rural, valor y superficie siniestrada por municipio y cultivo | **Verificado** (35,902 filas en 2025; codificación latin-1) |
| FIRA, Agrocostos: archivo `/Nd/agrocosto_data_completa.csv` que carga la página interactiva | Cuota de crédito, costo, rendimiento y precio de referencia por estado y zona | **Verificado**: 1,340 filas, 118 columnas, 2015–2022, a nivel estado y zona, no municipio. Estado de México, maíz alta productividad: 4 filas (2016, 2019, 2021, 2022). Fila de 2022 (Valles Altos, temporal mejorada fertilizada): rendimiento 6/7/9 t/ha (pesimista/probable/optimista), precio probable $6,700/t, ingreso probable $46,900/ha, total financiable cerca de $29,845/ha, tasa 16 %. La vigencia es de 2022; los datos de 2024 a 2026 están en PDF por estado |
| INEGI, Censo Agropecuario 2022 y ENA 2019 | Crédito y seguro; perfil del productor | **Verificado** (resúmenes leídos) |
| INEGI, ENA 2014 (motivos de no solicitar) | Sección 3 | **Reportado** |
| FIRA, Lineamientos Cosechando Soberanía, ed. 8 — fira.gob.mx/Nd/fondoCosechandoSoberania.jsp | Reglas, requisitos, tasas, incentivos | **Reportado** (confirmar el original) |
| SADER, Cosechando Soberanía; FIRA, Avances y Resultados 2026 | Elegibilidad, montos, alcance | **Verificado** (páginas leídas) |

**Advertencias de datos (verificadas):** en SIAP 2015–2020 la columna de precio se llama `Precio` y desde 2021 `Preciomediorural`; los archivos de 2020 y 2021 tienen unas 28,700 filas frente a unas 37,000 en otros años. SIAP mezcla productores de todos los tamaños y sus cifras son anuales y municipales. "Siniestrada" incluye clima y también plagas y enfermedades. Los costos de Agrocostos son de 2022 y FIRA advierte que provienen de pocas observaciones; la interfaz etiqueta el año y deja que el productor los edite.

## 8. Modelo de impacto económico (escenario, no promesa)

**Beneficio por productor (B)** = bonificación de tasa (9 puntos × monto × meses / 12) + incentivo de seguro (porcentaje del segmento × monto). Es una regla del programa, no una estimación nuestra, y solo se obtiene pagando a tiempo.
- *Ejemplo aritmético (Reportado):* monto de $80,000 durante 8 meses: $4,800 + $4,000 = $8,800.

**Impacto anual = P × a × B**
- **P** = productores que completan la ruta (parámetro).
- **a** = fracción que después solicita (**supuesto sin evidencia**; se mide en un piloto).

Esto es un traspaso del programa que el productor deja de perder si no solicita; no es producción nueva. Un estudio del BID sobre créditos de FND reporta efectos en el valor de la producción, pero **la magnitud no está verificada** y no forma parte de la cifra principal.

**Medición propuesta:** línea base 6.1 %; piloto escalonado por CADER; indicadores: expedientes presentados y créditos otorgados, medidos con registros del intermediario, no lecciones completadas. Como referencia pesimista, la literatura muestra efectos pequeños de la educación en conductas (unos 0.1 desviaciones estándar).

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| La barrera principal es el costo (tasas), no la información | No se promete bajar tasas; se muestra el costo real con y sin bonificación |
| Inducir a endeudarse a quien no le conviene | Señal de alerta por punto de equilibrio y vía "no pedir" sin presión |
| Duplica herramientas de FIRA (Agrocostos, AgroBitácora, módulo web) | Declararlo; diferenciar por voz, referencias municipales, checklist con "lo que no te pueden exigir" y hoja; proponer a FIRA como canal |
| Datos de Agrocostos viejos y escasos (2022; 4 filas para maíz en Estado de México) | Etiquetar año; permitir editar; mostrar rangos; no sugerir cifras sin fuente |
| Reglas del programa inconsistentes entre fuentes | Mostrar fuente y fecha; "confirma con la CADER" |
| La IA inventa requisitos | Base cerrada, citas, "no lo sé", set de pruebas |
| Datos personales (voz, ubicación) y ley de datos de 2025 | No guardar audio ni perfil; consentimiento claro; aviso de que el audio se envía a un tercero (Mistral) para transcribirlo |
| Regulación financiera (no ser oferta ni asesoría) | Lista de expresiones a evitar; aviso de alcance; **[PENDIENTE]** revisión con quien sepa de regulación |
| Usuarios de edad avanzada, conectividad e idiomas (46.3 % se considera indígena) | Voz y pasos cortos; lenguas indígenas en la ruta de mejora |
| Conflicto de interés si el instituto cobra por capacitación | Declararlo; la app no vende ni deriva a servicios propios |
| Cuellos de botella del intermediario (líneas suspendidas, apertura, aval) | Avisarlo en la hoja; no se puede resolver con la app |

## 10. Prototipo y demostración

**Núcleo mínimo (alcance de hoy):** perfil por voz, reglas de elegibilidad y expediente, calculadora (Agrocostos + SIAP preprocesados a archivos JSON), asistente con citas y hoja imprimible. Web que se ve bien en celular. **Decisión del autor:** Next.js desplegado en Vercel; el constructor puede cambiarlo si lo justifica.

**Guion de 3 minutos**
1. 0:00–0:30. Problema: 6.1 % con crédito; 1.1 % en Estado de México contra 34.5 % en Sinaloa; casi todos los que piden lo obtienen; pocos piden.
2. 0:30–1:15. Un productor habla (maíz, 3 ha, municipio) y aparecen su perfil y la respuesta a "¿califico?".
3. 1:15–2:15. "¿Qué me piden y qué no me pueden exigir?" (con cita) y "mis cuentas" (rango de monto, costo real 17.5 % contra 8.5 % si paga a tiempo, riesgo del municipio).
4. 2:15–2:40. La hoja de una página.
5. 2:40–3:00. Impacto como escenario y ruta de mejora.

## 11. Ruta de mejora

1. Piloto con medición, con comparación, por CADER.
2. Conversación con FIRA y SADER para usar la app como canal de orientación y conectarla con AgroBitácora y el módulo web.
3. Datos vigentes de Agrocostos 2024–2026 (hoy en PDF por estado).
4. WhatsApp y lenguas indígenas.
5. Con demanda local identificada (por ejemplo compra pública local), el productor tiene mejor caso para el crédito.

## 12. Decisiones de diseño tras la revisión del constructor (criterio del autor)

1. **Calculadora.** Entradas: cultivo, hectáreas, municipio (de la voz) y monto a solicitar (por defecto, cuota de crédito por hectárea × hectáreas, editable). Parámetros: tasa bruta 17.5 %, bonificación de 9 puntos si paga a tiempo (neta 8.5 %). Supuesto: un ciclo, con pago único al cierre de cosecha. El segmento se asigna como el tope más pequeño que cubre el monto (supuesto). Salidas: intereses, total a pagar, ingreso y utilidad esperados, equilibrio y margen.
2. **Contenido sin confirmar en la demo.** Nada pendiente se presenta como hecho; los valores de ejemplo llevan "Ejemplo, sin verificar". Lo "Reportado" se muestra con su fuente y fecha, y con la indicación de confirmar con la CADER.
3. **Base documental y pruebas.** El corpus es el texto de los lineamientos (a obtener al construir) y las páginas de SADER y FIRA. Las 20 preguntas de prueba se derivan del corpus; fuera del corpus, la respuesta esperada es "no lo sé".
4. **Impacto.** Un panel final con la fórmula, el ejemplo de B y una tabla de sensibilidad de *a* (valores hipotéticos etiquetados), sin cifra puntual. Si falta tiempo, una diapositiva.
5. **Voz.** Voxtral desde una ruta del servidor; la clave como variable de entorno del servidor, nunca en el repositorio. Aviso de que el audio se envía a un tercero y no se guarda. Alternativa de escribir y un audio pregrabado de respaldo.
6. **Entrega.** Formato de la demostración, repositorio público y URL: **[PENDIENTE: definir con el equipo]**. Por defecto: demostración en vivo en laptop, repositorio con README, sin URL pública.
7. **Tiempo y gente.** **[PENDIENTE: confirmar]**. Por defecto: dos personas (el participante y el asistente de construcción), construcción hasta unos 30 minutos antes de la clausura.

## 13. Pendientes de verificación

1. Confirmar el texto original de los lineamientos (requisitos máximos, tasa y bonificación, elegibilidad, segmentos e incentivos de seguro, art. 32-D).
2. Cómo verificar o preguntar la pertenencia al padrón de SADER.
3. Revisión de los límites regulatorios por alguien con criterio jurídico.
4. Formato de entrega, tiempo y personas (sección 12).

## 14. Fuentes

- INEGI, Censo Agropecuario 2022: https://www.inegi.org.mx/contenidos/programas/ca/2022/doc/ca2022_rdnal.pdf (por entidad: ca2022_rdSIN.pdf, ca2022_rdCAM.pdf; Estado de México: https://en.www.inegi.org.mx/contenidos/programas/ca/2022/doc/ca2022_rdMEX.pdf)
- INEGI, ENA 2019: https://www.inegi.org.mx/contenidos/programas/ena/2019/doc/rrdp_ena2019.pdf
- INEGI, ENA 2014, crédito y seguro: https://www.inegi.org.mx/contenidos/programas/ena/2014/doc/minimonografia/credsegena14.pdf
- INEGI, ENDUTIH 2025: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/endutih/ENDUTIH_25_RR.pdf
- SADER, Cosechando Soberanía: https://www.gob.mx/agricultura/acciones-y-programas/cosechando-soberania
- FIRA, Cosechando Soberanía: https://www.fira.gob.mx/Nd/pagCosechandoSoberania.jsp ; lineamientos: https://www.fira.gob.mx/Nd/fondoCosechandoSoberania.jsp
- FIRA, Avances y Resultados 2026: https://www.fira.gob.mx/Files/AvancesyResultados2026.pdf
- FIRA, Agrocostos: https://www.fira.gob.mx/Nd/Agrocostos.jsp
- Gobierno de Sinaloa (tasa y bonificación): https://sinaloa.gob.mx/por-medio-del-programa-cosechando-soberania-fira-dispersara-credito-a-agricultores-para-el-siguiente-ciclo
- SIAP, datos abiertos agrícolas: https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php
- Kaiser, Lusardi, Menkhoff y Urban (2022), "Financial education affects financial knowledge and downstream behaviors": https://www.nber.org/papers/w27057
- BID, "¿Liquidez o capital?": https://www.iadb.org/es/blog/efectividad-del-desarrollo/liquidez-o-capital-como-el-acceso-credito-ayuda-los-productores-rurales-en-mexico

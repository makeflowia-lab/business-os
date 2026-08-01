# Business OS — Roadmap: el Business OS más deseado

> Basado en investigación comparativa multi-agente (ene 2026, ~40 hallazgos con fuente
> de CB Insights, Gartner, MIT NANDA, a16z, PitchBook, reseñas reales de usuarios).
> Objetivo: que el empresario diga **"lo quiero, lo necesito"**.

---

## 1. Lo que dice el mercado (verificado)

### La oportunidad es real y nadie la ha tomado

- **95% de los pilotos de IA empresarial no producen impacto en el P&L** (MIT NANDA 2025).
  La causa NO es la calidad de los modelos: es el **"learning gap"** — las herramientas
  genéricas no aprenden ni se adaptan a los flujos de la empresa. *Eso es exactamente lo
  que nuestro Learning Engine + memoria única resuelven.*
- **79% de empresas dice haber adoptado agentes; menos del 17% los tiene en producción**
  (Gartner ago-2025). El despliegue confiable no está resuelto por nadie.
- **Gartner: >40% de proyectos agentic AI serán cancelados para 2027** por costos,
  valor difuso o falta de controles de riesgo. Solo ~130 vendors de miles son reales
  ("agent washing"). → Gobierno + ROI medible = diferenciador de supervivencia.
- **~50% del batch YC Spring 2025 es agentic AI, fragmentado en 18 categorías** —
  nadie cubre un "OS" completo. La infraestructura (memoria unificada, confiabilidad,
  datos no estructurados) sigue siendo gap activo que startups nuevas atacan por piezas.

### LATAM/hispano es el gap geográfico gigante

- LATAM = **1.12% del gasto mundial en IA** pese a ser 6.6% del PIB global.
- **>80% de las PyMEs LATAM ya opera sobre WhatsApp Business API**; open rate >95%
  (vs 18-22% email). *El canal por defecto de nuestra PyME objetivo no es la web: es
  el chat.* Nuestro bot de Telegram ya validó el patrón — WhatsApp lo multiplica.
- Mercado IA LATAM: $29.5B (2025), agentes creciendo ~50% CAGR. Todo English-first.

### Los competidores dejan la puerta abierta

| Competidor | Precio real | Su debilidad (quejas verificadas) |
|---|---|---|
| Salesforce Agentforce | $2/conversación + $125–550/user/mes; TCO 50 personas ≈ **$680K/año**; exige Data Cloud | 3–6 meses a ROI, UX quejosa, requiere equipo Salesforce dedicado — PyMEs excluidas |
| Microsoft Copilot | $30–60/user/mes + créditos | Solo brilla dentro del ecosistema Microsoft; asistente, no operador |
| ClickUp/Monday/Notion AI | $7–10/user/mes | IA asistiva (resúmenes, Q&A), NO autónoma; per-seat |
| n8n / Make / Zapier | n8n: 40–80 h de implementación + DevOps; Zapier: facturas sorpresa $400–1,200 | Son herramientas: el dueño tiene que CONSTRUIR su automatización |
| Odoo / ERPNext | Fuertes en PyME 1–250 empleados | **Sin capa de IA nativa** — IA fragmentada de terceros |
| Sierra ($10B, $100M ARR) | Outcome-based | Solo servicio al cliente enterprise; valida el pricing por resultados |

**El hueco**: un cerebro empresarial completo, en español, por chat, instalado en un día,
con gobierno y ROI visibles, a precio de PyME. Nadie lo tiene. Nosotros ya tenemos el kernel.

---

## 2. Roadmap priorizado

### FASE 1 — "Lo quiero" (el momento wow de venta)

1. **WhatsApp Business como canal principal** ⭐ el hallazgo más contundente.
   Mismo `engine.ts`, nuevo adaptador (Meta Cloud API). El dueño le habla a su empresa
   por donde ya vive. Telegram queda como canal técnico/secundario.
2. **Panel de ROI: "esto me ahorró X horas / generó $Y"**. Contra el 95% sin impacto
   en P&L: cada acción ejecutada, email enviado, decisión y cron registra su tiempo
   ahorrado estimado; reporte mensual automático al chat. El empresario renueva porque
   VE el número.
3. **Conectar Google** (código listo — faltan las credenciales OAuth del dueño) y
   **pgvector** en cuanto haya API key de embeddings: búsqueda semántica real.
4. **Onboarding < 1 hora como arma de venta**: ya existe (Ingestor). Pulirlo con importación
   directa del primer Excel/CSV de clientes en la misma entrevista. Comparar en el pitch:
   *"Agentforce: 6 meses y $680K/año. Business OS: hoy mismo."*

### FASE 2 — "Confío" (matar los cancel-factors de Gartner)

5. **Aprobaciones por umbral en la Constitución**: montos/tipos que SIEMPRE piden
   confirmación del dueño (hoy es cola manual; formalizarlo como política ejecutable).
6. **Observabilidad de agentes**: los agentes "fallan en silencio" (gap reconocido —
   YC Lemma existe solo para eso). Alertar cuando un cron/regla falla N veces, reintentos,
   y salud del sistema visible en Gobierno.
7. **Multi-usuario con roles** cuando el primer cliente tenga equipo: el kernel de
   auditoría ya registra todo; falta identidad por usuario.

### FASE 3 — El foso (lo que nadie podrá copiar rápido)

8. **Learning Engine con feedback**: el dueño marca 👍/👎 y el sistema ajusta sus
   aprendizajes — ataca directamente el "learning gap" del MIT, la causa #1 de fracaso.
9. **Ingesta de no-estructurados**: >80% de los datos empresariales están atrapados en
   PDFs, fotos de facturas, audios de reuniones. Claude es multimodal: absorber todo eso
   al Brain es el multiplicador del grafo y las decisiones.
10. **Packs verticales semilla** (clínica, despacho, comercio, agencia): plantillas de
    entidades/KPIs/crons/reglas que el Ingestor ofrece según industria. Con 3 clientes
    del mismo vertical, el pack se vuelve producto.

### Pricing (validado por a16z/Sierra: per-seat está muriendo)

- **Setup fee** — "fundación del cerebro digital" (onboarding + ingesta + conexiones).
- **Mensualidad por resultados/uso** (acciones ejecutadas, no por asiento), en moneda local.
- El panel de ROI (item 2) es lo que justifica la renovación.

### Posicionamiento

> **"Instalamos un cerebro digital en tu empresa. En un día. En español. Por WhatsApp."**

No competimos con SAP/Salesforce (caros, lentos, enterprise) ni con n8n/Zapier
(herramientas que exigen construir). Somos la única categoría que el mercado no tiene:
el **sistema operativo inteligente dedicado**, llave en mano, para la PyME hispanohablante.

---

## 3. Qué NO hacer (decisiones firmes)

- **No per-seat pricing** — el modelo que a16z declara obsoleto y que hace odioso a Salesforce.
- **No marketplace de 7,000 integraciones** — Zapier ya ganó eso; nuestras integraciones
  nacen de lo que los clientes reales piden, construidas sobre el router en horas.
- **No multi-tenant SaaS** — un deploy por empresa es nuestro diferencial de privacidad
  y personalización ("tu cerebro es tuyo").
- **No "agent washing"** — cada capacidad nueva debe pasar por el kernel (router + auditoría
  + memoria); nada de features de folleto.

## Fuentes principales

MIT NANDA "GenAI Divide 2025" (via Fortune) · Gartner press 2025-06-25 y ago-2025 ·
CB Insights YC Spring/Fall 2025 · PitchBook · a16z Enterprise Newsletter dic-2024 ·
CRM Curator, SFAI Labs, Oliv.ai (reseñas Agentforce) · firstaimovers/startupowl
(n8n/Make/Zapier/Lindy) · scala-technologies (WhatsApp LATAM) · DeployMonkey/ERP Research
(Odoo/ERPNext). Nota: la verificación adversarial completa quedó parcial por límite de
sesión; las cifras clave de Gartner y CB Insights sí fueron verificadas (2-3 votos).

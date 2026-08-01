---
name: onboarding-empresa
description: La llave de encendido del Business OS. Entrevista al piloto sobre su empresa, rellena toda la capa de contexto (context/*.md), personaliza las reglas, adapta los cronjobs al negocio y deja el sistema 100% operativo. Usar cuando context/00_EMPRESA.md contenga marcadores {{ASI}}, cuando el usuario diga "configura mi empresa", "onboarding", "enciende el sistema", o sea su primera sesión.
---

# Onboarding de Empresa — Llave de Encendido

Convierte este Business OS genérico en el sistema operativo de UNA empresa concreta. Al terminar, no debe quedar ningún marcador `{{ASI:...}}` en `context/` y los crons deben estar sembrados.

## Principios

- **Entrevista conversacional, no formulario.** Pregunta en bloques de 3–4 preguntas máximo. Adapta las siguientes según las respuestas.
- **El piloto puede no saber.** Si no tiene respuesta (ej: no conoce su ICP), ofrece una hipótesis razonable, márcala como `[HIPÓTESIS]` y sigue. No bloquees el encendido por datos que no existen.
- **Cualquier tipo de empresa sirve**: SaaS, agencia, e-commerce, servicios locales, creador de contenido, freelance. Adapta vocabulario y crons al tipo.

## Fase 1 — Entrevista (bloques)

**Bloque A — Identidad:** nombre de la empresa, nombre del piloto, qué vende en una frase, etapa (idea/validación/primeros clientes/crecimiento), sector, país y zona horaria.

**Bloque B — Oferta y dinero:** productos/servicios con precios, modelo de cobro, propuesta de valor, qué NO hace. Fuente actual de la verdad sobre ingresos y gastos (Stripe, facturas, Excel, nada).

**Bloque C — Clientes y mercado:** cliente ideal, canales de adquisición, clientes clave actuales, objeciones típicas, 2–3 competidores y ventaja frente a ellos.

**Bloque D — Estrategia:** la métrica norte y su valor actual, objetivo a 90 días, 3 objetivos del trimestre, mayor riesgo, apuesta principal, anti-objetivos.

**Bloque E — Operación y estilo:** equipo y roles, horas/semana del piloto, presupuesto para herramientas, tono de marca, idioma, palabras prohibidas, qué flujos pre-autoriza (ej: responder FAQs) y a qué hora quiere su morning briefing.

## Fase 2 — Escritura del contexto

1. Rellena `context/00_EMPRESA.md`, `01_ESTRATEGIA.md`, `02_REGLAS_DE_ORO.md`, `03_DATOS.md` reemplazando TODOS los `{{ASI:...}}` con las respuestas. Elimina los avisos "Plantilla sin rellenar".
2. Genera 3–7 **reglas específicas del negocio** en `02_REGLAS_DE_ORO.md` derivadas de la entrevista (ej: "nunca ofrecer descuentos >20% sin aprobación").
3. Añade entrada en `context/04_APRENDIZAJES.md`: fecha de encendido y decisiones clave del onboarding.
4. Actualiza la sección "Tu rol" de `CLAUDE.md` con una línea que nombre la empresa y su métrica norte.
5. Muestra al piloto un resumen de lo escrito y pide correcciones antes de continuar.

## Fase 3 — Adaptación de cronjobs

1. Lee `automations/cronjobs-seed.json`.
2. **Adapta los prompts al negocio** (sector, métrica norte, fuentes de datos reales) y los horarios a la zona horaria del piloto. Desactiva (`"enabled": false`) los que no apliquen (ej: `analisis-competencia` sin competidores definidos).
3. Guarda el JSON adaptado.
4. Si `ALLOWED_CHAT_ID` está definido en `agent-server/.env`, ejecuta: `cd agent-server && npx tsx scripts/seed-crons.ts`. Si no, guía al piloto para vincular Telegram primero (ver `docs/SETUP_PROMPT.md`) y déjalo como pendiente explícito.

## Fase 4 — Verificación de encendido

Ejecuta y reporta este checklist:

- [ ] `grep -r "{{ASI" context/` devuelve vacío
- [ ] `agent-server/.env` tiene `ALLOWED_CHAT_ID` (o pendiente anotado)
- [ ] `npx tsx src/schedule-cli.ts list` muestra los crons sembrados
- [ ] `npx tsx scripts/status.ts` reporta el agente sano
- [ ] Fuentes 🔴 de `03_DATOS.md` listadas como pendientes con siguiente paso concreto

Cierra con: estado del sistema, los 3 primeros crons que se ejecutarán y UNA acción recomendada para el piloto según su estrategia.

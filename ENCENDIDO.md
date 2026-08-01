# 🏎️ ENCENDIDO — Guía del Piloto

Este Business OS es un Ferrari encendido esperando piloto: **no tiene idea de negocio fija**. Aliméntalo con los datos de cualquier empresa y se autoconfigura completo. Todo el proceso toma ~30 minutos.

---

## Paso 0 — Setup técnico (solo la primera vez)

Si es un clon fresco o faltan `.env`:

```
Abre Claude Code en esta carpeta y pega el contenido de docs/SETUP_PROMPT.md
```

Eso configura Supabase, Telegram, dependencias y servicios. **Imprescindible al final de este paso:** tener `ALLOWED_CHAT_ID` en `agent-server/.env` (tu chat de Telegram vinculado).

## Paso 1 — Girar la llave (onboarding de tu empresa)

Abre Claude Code en esta carpeta y di:

```
Enciende el sistema
```

La IA detectará que `context/` tiene plantillas sin rellenar y ejecutará la skill `onboarding-empresa`: te entrevista sobre tu negocio (identidad, oferta, clientes, estrategia, reglas), escribe toda la capa de contexto y adapta los cronjobs a tu empresa.

## Paso 2 — Sembrar las automatizaciones

Al final del onboarding la IA lo hace sola, pero si quieres hacerlo manual:

```bash
cd agent-server
npx tsx scripts/seed-crons.ts          # siembra los crons activos
npx tsx src/schedule-cli.ts list       # verifica
```

Los 2 crons de ejemplo en inglés (`daily-summary`, `system-health`) quedan obsoletos — elimínalos:

```bash
npx tsx src/schedule-cli.ts delete daily-summary
npx tsx src/schedule-cli.ts delete system-health
```

## Paso 3 — Arrancar el motor

```bash
cd agent-server && npm start           # daemon del agente (o el servicio de fondo del Paso 0)
npx tsx scripts/status.ts              # health check
```

---

## Qué obtienes encendido

| Cuándo | Qué |
|---|---|
| 6:30 diario | ☀️ Morning briefing: métrica norte, dinero, pendientes, LA prioridad |
| 21:00 diario | Cierre del día y prioridad de mañana |
| L-V 10:00 | Seguimiento de leads sin respuesta (borradores listos) |
| Lunes 8:00 | Informe financiero semanal |
| Martes 9:00 | Cobros y facturas pendientes |
| Miércoles 7:00 | Análisis de competencia |
| Jueves 7:00 | Oportunidades de mercado |
| Viernes 7:00 | 5 ideas de contenido |
| Domingo 18:00 | 📅 Revisión semanal + nuevo foco |
| Mensual | Informe KPI, limpieza de memoria |
| Sistema | Health check, backup del contexto |

Más 4 crons desactivados esperando conexiones (`--all` para verlos): pulso de métrica norte (Stripe), agenda de mañana (Calendar), resumen de inbox ×2 (Gmail).

## Para crecer

- **Nueva habilidad:** di "crea una skill para X" → skill `skill-creator`.
- **Nuevo cron:** `npx tsx src/schedule-cli.ts create "<prompt>" "<cron>" <chatId>`
- **Conectar Stripe/Gmail/Calendar:** actualiza `context/03_DATOS.md` y activa los crons dormidos.

## Regla de oro del piloto

El contexto es el activo. Los modelos son commodities. Si `context/` deja de actualizarse, el sistema muere aunque el código funcione — la revisión semanal existe para evitarlo.

---
name: morning-briefing
description: Briefing matinal del negocio. Usar cuando el piloto diga "briefing", "buenos días", "qué hay hoy", "resumen del día", o cuando lo invoque el cron morning-briefing. Resume estado, métricas, pendientes y la prioridad única del día.
---

# Morning Briefing

Resumen ejecutivo de arranque del día en <300 palabras. El piloto debe poder leerlo en 90 segundos y saber exactamente qué hacer.

## Contexto requerido

`context/01_ESTRATEGIA.md` (métrica norte y foco semanal), `context/03_DATOS.md` (dónde consultar), `context/02_REGLAS_DE_ORO.md`.

## Pasos

1. **Métrica norte:** consulta su valor real en la fuente indicada en `03_DATOS.md`. Si la fuente está 🔴, repórtalo como "sin dato — fuente no conectada" (nunca inventar).
2. **Dinero:** movimientos relevantes desde ayer (Finance OS / fuente de ingresos). Alertas si hay gasto inusual o cobro pendiente.
3. **Tareas:** pendientes de hoy en Mission Control (tablero) y resultados de crons nocturnos (último `last_result` en scheduler).
4. **Agenda:** eventos de hoy si Calendar está conectado; si no, omitir la sección.
5. **Riesgos/oportunidades:** máximo 2, solo si son accionables hoy.
6. **LA prioridad:** una sola acción recomendada para hoy, derivada del foco semanal de `01_ESTRATEGIA.md`. Justifícala en una línea.

## Formato de salida

```
☀️ Briefing — {fecha}
📊 {métrica norte}: {valor} ({tendencia vs. ayer/semana})
💰 Dinero: {1-2 líneas}
✅ Pendientes: {top 3}
⚠️ Atención: {solo si hay algo}
🎯 HOY: {la única prioridad}
```

## Reglas

- Sin relleno ni motivación vacía. Datos y decisión.
- Si algo falló en los crons nocturnos, va primero.
- Si se detecta un patrón nuevo (3+ días con la misma alerta), añadir entrada a `context/04_APRENDIZAJES.md`.

---
name: revision-semanal
description: Revisión estratégica semanal. Usar cuando el piloto diga "revisión semanal", "cerramos la semana", "review", o cuando lo invoque el cron revision-semanal (domingos). Audita métricas vs. objetivos, actualiza el foco semanal y mantiene el contexto vivo.
---

# Revisión Semanal

Cierra la semana con datos y abre la siguiente con UN foco. Es también el mantenimiento de la Capa 1: aquí el contexto se mantiene vivo o muere.

## Contexto requerido

Todos los archivos de `context/`.

## Pasos

1. **Números de la semana:** métrica norte (valor y delta semanal), ingresos/gastos, leads/clientes nuevos. Solo fuentes reales de `03_DATOS.md`.
2. **Objetivos:** progreso contra los 3 objetivos del trimestre (`01_ESTRATEGIA.md`). Sé honesto: "sin avance" es una respuesta válida.
3. **Foco cumplido:** ¿se ejecutó el foco de la semana pasada? Si no, ¿por qué? (registrar patrón si se repite).
4. **Auditoría de contexto:** revisa `context/*.md` buscando datos obsoletos o contradicciones con la realidad de la semana. Propón correcciones concretas; aplícalas con aprobación del piloto.
5. **Auditoría de crons:** `cd agent-server && npx tsx src/schedule-cli.ts list` — ¿alguno fallando o ya inútil? Proponer pausar/ajustar. ¿Alguna tarea manual repetida esta semana que merezca cron nuevo? → invocar `skill-creator`.
6. **Nuevo foco:** propone el foco único de la próxima semana (derivado de objetivos + números). Discútelo con el piloto y escríbelo en `01_ESTRATEGIA.md` (sección "Prioridad de la semana", con fecha).
7. **Registrar:** añade a `04_APRENDIZAJES.md` qué funcionó y qué no esta semana (1–3 entradas fechadas).

## Formato de salida

```
📅 Semana {n} — {fechas}
📊 Números: {métrica norte y deltas}
🎯 Objetivos Q: {✅/🟡/🔴 por objetivo}
🔍 Contexto: {cambios aplicados o "al día"}
🤖 Crons: {estado, cambios}
➡️ FOCO PRÓXIMA SEMANA: {uno solo}
```

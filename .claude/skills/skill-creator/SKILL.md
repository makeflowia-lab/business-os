---
name: skill-creator
description: Crea nuevas skills para este Business OS. Usar cuando el piloto pida "crea una skill para X", cuando una tarea se repita 3+ veces sin skill propia, o cuando la revision-semanal detecte un proceso automatizable. Es la skill que permite al sistema expandirse a sí mismo.
---

# Skill Creator

Genera skills nuevas en `.claude/skills/<nombre>/SKILL.md` siguiendo el patrón de este repo.

## Proceso

1. **Desafía primero:** ¿esta skill genera apalancamiento real o es un capricho? Si la tarea ocurre <1 vez/mes y toma <5 min, di que no vale la pena y por qué.
2. **Define el disparador:** ¿cuándo exactamente debe activarse? El `description` del frontmatter debe incluir frases literales que diría el piloto.
3. **Contexto obligatorio:** toda skill de negocio debe empezar leyendo los archivos relevantes de `context/` y respetar `context/02_REGLAS_DE_ORO.md`.
4. **Escribe la skill** con esta estructura:

```markdown
---
name: nombre-en-kebab-case
description: Qué hace + cuándo usarla (con frases disparadoras literales).
---

# Título

Objetivo en una línea.

## Contexto requerido
(qué archivos de context/ leer antes)

## Pasos
(numerados, concretos, con comandos reales si aplica)

## Resultado esperado
(qué entregar y en qué formato; qué registrar en 04_APRENDIZAJES.md)
```

5. **Prueba en seco:** simula una ejecución con un caso real del negocio y muestra el resultado al piloto.
6. **Si la skill debe correr sola** (sin piloto presente), no basta con la skill: crea también un cronjob con `cd agent-server && npx tsx src/schedule-cli.ts create "<prompt>" "<cron>" <chatId>` cuyo prompt invoque la lógica de la skill.

## Reglas

- Una skill = un trabajo. Si necesita hacer dos cosas distintas, son dos skills.
- Nunca duplicar una skill existente: revisa `.claude/skills/` primero.
- Registrar cada skill creada en `context/04_APRENDIZAJES.md` (decisión + para qué sirve).

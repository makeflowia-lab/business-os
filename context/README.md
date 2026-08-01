# context/ — La Capa 1 del Business OS

Esta carpeta es el **cerebro de contexto** del sistema. Todo lo que la IA sabe del negocio vive aquí, en archivos versionables y editables.

## Regla de encendido

Si cualquier archivo de esta carpeta contiene marcadores `{{ASI}}`, el sistema está **APAGADO** (sin piloto). En ese estado, la única acción válida de la IA es ejecutar la skill `onboarding-empresa` para entrevistarte y rellenarlo todo.

Cuando no quedan marcadores, el sistema está **ENCENDIDO** y la IA opera con contexto completo.

## Archivos

| Archivo | Qué contiene | Quién lo escribe |
|---|---|---|
| `00_EMPRESA.md` | Identidad: qué vendes, a quién, cómo cobras | Onboarding |
| `01_ESTRATEGIA.md` | Objetivos, métricas norte, prioridades del trimestre | Onboarding + revisión semanal |
| `02_REGLAS_DE_ORO.md` | Valores, tono, límites, lo que NUNCA se hace | Onboarding + tú |
| `03_DATOS.md` | Mapa de fuentes de datos: qué está conectado y dónde consultar cada cosa | Onboarding + al conectar algo nuevo |
| `04_APRENDIZAJES.md` | Errores cometidos, decisiones tomadas y por qué | La IA, continuamente |

## Reglas de mantenimiento

1. Estos archivos son la fuente de verdad. Si contradicen a la memoria SQLite, ganan estos archivos.
2. La IA los actualiza cuando aprende algo relevante (con cambios pequeños y fechados, nunca reescrituras completas sin permiso).
3. La `revision-semanal` los audita: datos obsoletos se corrigen o marcan.
4. Nunca guardar credenciales aquí — eso va en `.env`.

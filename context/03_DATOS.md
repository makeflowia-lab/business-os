# 03 — Mapa de Datos (Capa 2)

> ⚠️ **APAGADO** — Rellena los marcadores {{ASI:...}}
>
> Fuente de verdad sobre qué está conectado y dónde consultar cada dato.
> Actualizar cada vez que se conecta o desconecta una fuente.

---

## Estado de conexiones

| Fuente | Estado | Para qué sirve | Cómo consultar |
|---|---|---|---|
| {{ASI:FUENTE_1}} | {{ASI:ESTADO_1}} | {{ASI:PROPOSITO_1}} | {{ASI:CONSULTA_1}} |
| {{ASI:FUENTE_2}} | {{ASI:ESTADO_2}} | {{ASI:PROPOSITO_2}} | {{ASI:CONSULTA_2}} |
| {{ASI:FUENTE_3}} | {{ASI:ESTADO_3}} | {{ASI:PROPOSITO_3}} | {{ASI:CONSULTA_3}} |

---

## Dónde vive cada dato de negocio

{{ASI:MAPA_DATOS_NEGOCIO}}

---

## Regla de consulta

Ante una pregunta de datos ("¿cuántos {{X}}?", "¿estado de {{Y}}?"):

1. Consultar la tabla de arriba
2. Si la fuente está 🔴 → dato no disponible aún; indicar cuál es el bloqueador
3. Si está 🟢 → consultar directamente según "Cómo consultar"
4. Nunca fabricar datos — si no está conectado, decirlo

# Business OS — AI Business Operating System

> El sistema operativo inteligente de tu empresa.
> Una empresa. Un Business OS. Una única memoria. Un único modelo del negocio.

No es un chatbot que responde. Es un sistema que **piensa**: analiza ventas, caja,
capacidad, riesgos e historial antes de recomendar. Su misión es ser la **memoria,
el analista, el coordinador y el copiloto estratégico** de la empresa.

## Arquitectura

```
Business Constitution   → identidad, principios, límites, forma de razonar (versionada)
Enterprise Knowledge    → documentos → fragmentos indexados (FTS español, Neon Postgres)
Business Memory         → historial vivo: decisiones, eventos, conversaciones
Capability Layer        → Decision Engine + Automation Engine (cola con aprobación)
Specialized Agents      → CEO, Finanzas, RRHH, Ventas, Ops, Marketing, Legal, Soporte, Analytics
                          — todos sobre el mismo cerebro
```

| Módulo | Dónde vive |
|---|---|
| Enterprise Brain | Neon Postgres (`db/schema.sql`, tablas `bo_*`) |
| Knowledge Engine | `/conocimiento` + `api/knowledge` (chunking + FTS español + trigram) |
| Business Intelligence | KPIs en el dashboard + contexto en cada análisis |
| Decision Engine | `/decisiones` + `api/decisions` (análisis multi-lente en JSON) |
| Automation Engine | `/acciones` + `api/actions` (propone → apruebas → ejecuta) |
| Specialized Agents | `/agentes` + `api/agents/chat` |
| IA | Claude Agent SDK local (sesión de Claude Code, sin API key) |

## Setup

```bash
npm install
cp .env.example .env.local   # pon tu DATABASE_URL de Neon (y TELEGRAM_BOT_TOKEN si usarás el bot)
npm run db:setup             # aplica schema + siembra los 9 agentes
npm run dev                  # consola web → http://localhost:3010
npm run bot                  # bot de Telegram (proceso aparte, no necesita la web)
```

## Bot de Telegram — el Business OS en tu bolsillo

El bot se **vincula al primer chat que le escriba** (queda registrado en `bo_settings`;
para fijarlo manualmente usa `TELEGRAM_ALLOWED_CHAT_ID`). Cualquier otro chat es rechazado.

- Mensaje normal → hablas con el **agente activo** (por defecto 👑 CEO)
- `/agente finanzas` → cambias de especialista · `/agentes` los lista
- `/decidir ¿Contratamos tres vendedores?` → Decision Engine completo desde el celular
- `/resumen` · `/buscar <tema>` · `/doc título | contenido` · `/kpi MRR 1568`
- `/accion <texto>` · `/acciones` · `/ejecutar <n>` · `/rechazar <n>`

Web y bot comparten los mismos motores ([src/lib/engine.ts](src/lib/engine.ts)):
lo que hagas desde el celular queda en la misma memoria que ve la consola.

## Primer uso

**Recomendado: `/onboarding`** — el Onboarding Ingestor te entrevista (≈8 preguntas) y
construye solo el gemelo digital: constitución, entidades, KPIs con valores y
automatizaciones sugeridas adaptadas a tu industria. Revisas la propuesta y fundas el OS
con un clic.

Ruta manual:

1. **Constitución** — funda el Business OS: nombre + descripción → "Generar borrador con IA" → edita → guarda.
2. **Conocimiento** — alimenta el Brain: pega documentos, contratos, notas, exportes CSV.
3. **Empresa** — registra entidades: clientes, personas, productos, proyectos.
4. **Cerebro** — crea tus KPIs (MRR, churn, caja…) y registra valores.
5. **Decisiones** — hazle la primera pregunta estratégica. Verás el análisis por lentes,
   riesgos, recomendación, confianza y acciones sugeridas.
6. **Acciones** — aprueba y ejecuta lo que el sistema propone (emails, reportes, briefs).

Cuanto más conocimiento y datos reales tenga el Brain, mejor piensa.
Si un dato no existe, el sistema lo declara como faltante — nunca lo inventa.

## Centinela y Gobierno

- **Centinela** (`bo_rules`): vigilancia de KPIs por umbral. "si el MRR baja de 1000
  avísame y genera un análisis de caja" — se evalúa cada 30 s en el proceso del bot,
  notifica por Telegram y puede ejecutar una instrucción. UI en `/automatizacion`,
  comando `/reglas` en Telegram, o por lenguaje natural.
- **Gobierno** (`bo_audit`, página `/gobierno`): auditoría inmutable de operaciones
  sensibles — decisiones, acciones ejecutadas/rechazadas, emails, crons, reglas,
  constitución — con canal de origen (web, telegram, cron, regla).

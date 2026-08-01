# 📁 Estructura del Proyecto

## Vista general de carpetas y propósito

```
business-os/
│
├── 📘 README.md                          ← EMPIEZA AQUÍ (visión general)
├── 🚀 ENCENDIDO.md                       ← Guía paso a paso para pilotos
├── 📐 ESTRUCTURA.md                      ← Este archivo
│
├── 📂 context/                           🔥 CAPA 1 — CONTEXTO (fuente de verdad)
│   ├── 00_EMPRESA.md                     Identidad, oferta, clientes, competencia
│   ├── 01_ESTRATEGIA.md                  Métrica norte, objetivos, foco semanal
│   ├── 02_REGLAS_DE_ORO.md               Valores, tono, reglas vinculantes
│   ├── 03_DATOS.md                       Mapa de fuentes conectadas
│   ├── 04_APRENDIZAJES.md                Registro de errores, decisiones, wins
│   └── README.md                         Explicación de cada archivo
│
├── 📂 business-os/                       🧠 CAPA 3 — ENTERPRISE BRAIN
│   │                                     Next.js 16 + Neon + 9 agentes
│   ├── src/
│   │   ├── app/                          Páginas web (empresa, estrategia, KPIs, etc.)
│   │   │   ├── page.tsx                  Home / Dashboard
│   │   │   ├── empresa/page.tsx          Datos de la empresa
│   │   │   ├── estrategia/page.tsx       Objetivos y foco
│   │   │   ├── kpis/page.tsx             Métricas en vivo
│   │   │   ├── decisiones/page.tsx       Historial de decisiones
│   │   │   ├── memoria/page.tsx          Memoria del agente
│   │   │   ├── agentes/page.tsx          Estado de los 9 agentes
│   │   │   ├── gobierno/page.tsx         Health check del sistema
│   │   │   ├── automatizacion/page.tsx   Gestión de crons
│   │   │   ├── conocimiento/page.tsx     Base de conocimiento
│   │   │   └── ... (9 secciones totales)
│   │   │
│   │   ├── api/                          APIs REST (consulta el Brain)
│   │   │   ├── agents/route.ts           Lista de 9 agentes + estado
│   │   │   ├── summary/route.ts          Resumen del contexto
│   │   │   ├── knowledge/route.ts        Base de conocimiento viva
│   │   │   ├── decisions/route.ts        Historial de decisiones
│   │   │   ├── kpis/route.ts             Métricas en vivo
│   │   │   ├── roi/route.ts              ROI de cada acción
│   │   │   ├── health/route.ts           Health check
│   │   │   ├── schedule*/route.ts        Gestión de crons
│   │   │   └── ... (20+ endpoints)
│   │   │
│   │   ├── lib/
│   │   │   ├── db.ts                     Pool de conexión a Neon
│   │   │   ├── ai.ts                     Integración con Claude API
│   │   │   ├── brain.ts                  Core logic del Decision Engine
│   │   │   ├── knowledge.ts              Búsqueda + ingestión de conocimiento
│   │   │   ├── audit.ts                  Auditoría del sistema
│   │   │   ├── rules.ts                  Aplicación de reglas de oro
│   │   │   ├── health.ts                 Health checks
│   │   │   └── ... (15+ módulos)
│   │   │
│   │   └── components/
│   │       ├── Sidebar.tsx               Navegación principal
│   │       ├── CommandBar.tsx            Barra de comandos (/... sintaxis)
│   │       ├── Sphere.tsx                Visualización de agentes
│   │       └── ui.tsx                    Componentes compartidos
│   │
│   ├── db/
│   │   └── schema.sql                    Schema completo de Neon
│   │
│   ├── package.json                      Dependencias
│   ├── next.config.ts                    Config Next.js
│   ├── tsconfig.json                     Config TypeScript
│   ├── tailwind.config.ts                Estilos Tailwind
│   └── README.md                         Setup específico de esta app
│
├── 📂 agent-server/                      ⚙️ CAPA 4 — AUTOMATIZACIÓN & MEMORIA
│   │                                     Claude Agent SDK + Telegram + Crons
│   ├── src/
│   │   ├── index.ts                      Daemon principal + webhook Telegram
│   │   ├── schedule-cli.ts               CLI para gestionar crons
│   │   ├── agents/                       Implementación de 9 agentes
│   │   ├── tools/                        Custom tools para agentes
│   │   ├── memory/                       Gestor de memoria SQLite
│   │   └── jobs/                         Implementación de crons
│   │
│   ├── store/
│   │   ├── agent-server.db               SQLite con memoria + scheduled_tasks
│   │   ├── agent-server.pid              PID del proceso (para restart)
│   │   └── conversations/                Historial de chats
│   │
│   ├── scripts/
│   │   ├── seed-crons.ts                 Siembra inicial de 16 crons
│   │   ├── status.ts                     Health check del agente
│   │   ├── backup-context.ts             Backup de context/ a SQLite
│   │   └── ... (utilidades)
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── 📂 finance-os/                        💰 Dashboard financiero
│   │                                     Next.js 16 + Neon
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                  Dashboard principal
│   │   │   ├── gastos/page.tsx           Categorización de gastos
│   │   │   ├── ingresos/page.tsx         MRR, ARR, Stripe sync
│   │   │   ├── roi/page.tsx              ROI por inversion
│   │   │   └── presupuesto/page.tsx      Presupuesto vs realidad
│   │   │
│   │   ├── api/
│   │   │   ├── expenses/route.ts         CRUD de gastos
│   │   │   ├── revenue/route.ts          Sync con Stripe
│   │   │   ├── roi/route.ts              Cálculos de retorno
│   │   │   └── forecast/route.ts         Proyecciones
│   │   │
│   │   └── lib/
│   │       ├── stripe.ts                 Integración Stripe/Polar
│   │       ├── calculations.ts           Matemáticas financieras
│   │       └── categories.ts             Categorización automática
│   │
│   ├── package.json
│   └── README.md
│
├── 📂 Mission-Control/                   🎛️ Dashboard de tareas
│   │                                     Next.js 16 + Supabase
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                  Tablero de tareas
│   │   │   ├── chat/page.tsx             Chat con agentes
│   │   │   ├── historial/page.tsx        Registro de acciones
│   │   │   └── integraciones/page.tsx    Estado de conectores
│   │   │
│   │   ├── api/
│   │   │   ├── tasks/route.ts            CRUD de tareas
│   │   │   ├── chat/route.ts             Mensajes con agentes
│   │   │   └── audit/route.ts            Auditoría de acciones
│   │   │
│   │   └── lib/
│   │       ├── supabase.ts               Cliente de Supabase
│   │       └── realtime.ts               Actualizaciones en vivo
│   │
│   ├── package.json
│   └── README.md
│
├── 📂 .claude/                           🤖 Instrucciones para Claude Code
│   └── skills/
│       ├── onboarding-empresa/           ← La skill más importante
│       │   ├── SKILL.md                  Entrevista + setup automático
│       │   └── templates/                Plantillas de documentación
│       │
│       ├── skill-creator/                Crea nuevas skills
│       ├── morning-briefing/             Briefing diario 7 AM
│       ├── revision-semanal/             Revisión semanal domingo 6 PM
│       └── ... (más skills)
│
├── 📂 automations/                       🔄 Definición de crons
│   └── cronjobs-seed.json                16 crons listos (ID + schedule)
│
├── 📂 docs/                              📚 Documentación técnica
│   ├── SETUP_PROMPT.md                   Setup inicial (variables, servicios)
│   ├── MCP_SERVERS.md                    Cómo conectar nuevas fuentes
│   ├── API_REFERENCE.md                  Documentación de endpoints
│   └── ... (guías específicas)
│
├── .gitignore                            ← Protege .env, node_modules, .db
├── package.json                          Root dependencies
└── .env.example                          Template de variables de entorno
```

---

## 🎯 Por dónde empezar según tu rol

### Piloto de negocio (tú)
```
1. Clona el repo
2. Lee README.md (2 min)
3. Lee ENCENDIDO.md (5 min)
4. Abre Claude Code y di "Enciende el sistema" (30 min)
5. ¡Listo! Comienza a operar
```

### Desarrollador que quiere extender
```
1. Lee ESTRUCTURA.md (este archivo)
2. Entiende las 5 capas (README.md, sección "Las 5 Capas")
3. Ve a business-os/README.md para setup técnico
4. Ve a agent-server/README.md para entender cómo añadir skills
5. Crea tu integración en .claude/skills/
```

### DevOps que quiere desplegar
```
1. Ve a docs/SETUP_PROMPT.md
2. Configura Neon, Supabase, Telegram, Stripe, Google OAuth
3. Deploy: Vercel para Next apps, Docker/VPS para agent-server
4. Verifica health checks: business-os/api/health
5. Monitorea con agent-server scripts/status.ts
```

---

## 🔄 Flujo de datos (cómo todo se comunica)

```
┌──────────────────────────────────────────────────────────────┐
│                    Piloto (tú)                               │
│        (Telegram, web, Claude Code, voz...)                  │
└────────────────────┬─────────────────────────────────────────┘
                     │
         ┌───────────▼────────────┐
         │   Agent Server         │  ⚙️ CAPA 4
         │  (daemon + crons)      │  - Procesa comandos
         │                        │  - Corre automatizaciones
         │  SQLite (memoria)      │  - Telegram gateway
         └───────────┬────────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
   ┌──▼───┐      ┌──▼───┐      ┌──▼───┐
   │ Neon │      │Stripe│      │ Gmail │  🔌 CAPA 2
   │ (DB) │      │      │      │       │  Fuentes de datos
   └──────┘      └──────┘      └───────┘
      │
      └──────────────┬─────────────────────┐
                     │                     │
         ┌───────────▼──────┐  ┌──────────▼──────────┐
         │  Business OS     │  │  Finance OS        │  📊 UIs
         │  (Enterprise     │  │  (Dashboard)       │  CAPA 5
         │   Brain)         │  │                    │  (donde construyes)
         └──────────────────┘  └────────────────────┘
                     │
                     │
         ┌───────────▼────────────────────┐
         │  context/ (CAPA 1)             │
         │  - 00_EMPRESA.md               │  📝 CAPA 1
         │  - 01_ESTRATEGIA.md            │  Contexto
         │  - 02_REGLAS_DE_ORO.md         │  (fuente de verdad)
         │  - 03_DATOS.md                 │
         │  - 04_APRENDIZAJES.md          │
         └────────────────────────────────┘
```

**Flujo típico:**
1. Piloto pide algo (Telegram o web)
2. Agent Server lo procesa (consulta contexto, datos, memoria)
3. Interactúa con agentes especializados
4. Escribe en Neon si es permanente
5. Registra en SQLite local (memoria)
6. Responde al piloto + actualiza UIs

---

## 📊 Capas en detalle

| Capa | Qué es | Dónde | Herramientas |
|---|---|---|---|
| **1. Contexto** | Fuente de verdad | `context/` | Git (versionado) |
| **2. Datos** | Fuentes conectadas | Neon, APIs | Postgres, REST |
| **3. Inteligencia** | 9 agentes + decisiones | `business-os/` | Claude API + DB |
| **4. Automatización** | Crons + memoria | `agent-server/` | Node.js, SQLite |
| **5. Build** | Lo que construyas tú | Your app | Lo que quieras |

---

## ✅ Checklist de instalación

- [ ] Clonar repo
- [ ] `npm install` en root + todas las apps
- [ ] Copiar `.env.example` → `.env.local`
- [ ] Configurar Neon, Telegram, Groq, ElevenLabs
- [ ] Ejecutar `onboarding-empresa` en Claude Code
- [ ] Sembrar crons: `npx tsx scripts/seed-crons.ts`
- [ ] Arrancar agent-server: `npm start`
- [ ] Verificar health: `npx tsx scripts/status.ts`
- [ ] Visitar http://localhost:3010 (Business OS)
- [ ] ¡Listo! Comienza a operar

---

## 🚀 Próximos pasos

- **Extensiones:** Crea skills en `.claude/skills/`
- **Integraciones:** Conecta APIs nuevas (ver `docs/MCP_SERVERS.md`)
- **Customización:** Modifica agentes en `agent-server/src/agents/`
- **Deploy:** Sigue `docs/SETUP_PROMPT.md` para producción

---

**¿Tienes dudas sobre la estructura?** Abre un issue o pregunta en ENCENDIDO.md.

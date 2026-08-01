# 🏎️ Business OS — AI Strategic Partner

**Sistema operativo de negocio autoconfigurable.** Enciéndelo, aliméntalo con los datos de tu empresa, y opera tu negocio completo a través de un copiloto de IA.

Un Ferrari esperando al piloto — no tiene idea de negocio fija. Se adapta a **cualquier empresa, en cualquier idioma, en cualquier vertical.**

---

## ✨ Qué hace

El Business OS es **cinco capas vivas trabajando juntas:**

```
┌─────────────────────────────────────────────────┐
│ 5️⃣  BUILD — Construye SOBRE el negocio         │
├─────────────────────────────────────────────────┤
│ 4️⃣  AUTOMATIZACIÓN — Crons inteligentes         │
│    (morning briefing, revisión semanal,        │
│     seguimiento de KPIs, alertas...)           │
├─────────────────────────────────────────────────┤
│ 3️⃣  INTELIGENCIA — Agentes especializados      │
│    (9 roles: ventas, finanzas, producto...)    │
├─────────────────────────────────────────────────┤
│ 2️⃣  DATOS — Mapa de fuentes conectadas         │
│    (Neon, Stripe, Telegram, Gmail...)          │
├─────────────────────────────────────────────────┤
│ 1️⃣  CONTEXTO — Fuente de verdad                │
│    (Quiénes somos, estrategia, reglas)         │
└─────────────────────────────────────────────────┘
```

**Nunca trabajes en una capa sin las inferiores vivas.**

---

## 🚀 Primeros pasos (5 min)

### 1. Clonar

```bash
git clone https://github.com/makeflowia-lab/business-os.git
cd business-os
```

### 2. Instalar dependencias

```bash
npm install
cd business-os && npm install
cd ../agent-server && npm install
cd ../finance-os && npm install
cd ../Mission-Control && npm install
```

### 3. Encender el sistema

Abre Claude Code en esta carpeta y di:

```
Enciende el sistema
```

Eso ejecuta la skill `onboarding-empresa` que:
- Te entrevista sobre tu empresa (5 preguntas)
- Rellena toda la capa de contexto automáticamente
- Adapta los cronjobs a tu negocio
- Siembra las automatizaciones

**Todo en ~30 minutos.** Luego operarás el negocio hablándole a tu copiloto.

Ver guía completa: **[ENCENDIDO.md](ENCENDIDO.md)**

---

## 🧠 Las 5 Capas (profundidad)

### **Capa 1: Contexto** (`context/`)
Fuente de verdad sobre tu negocio. Nunca cambia sin documentar por qué.

- `00_EMPRESA.md` — Identidad, oferta, clientes, competencia
- `01_ESTRATEGIA.md` — Métrica norte, objetivos 90d, foco semanal
- `02_REGLAS_DE_ORO.md` — Valores, tono, límites, lo que NO hacemos
- `03_DATOS.md` — Mapa de qué está conectado (Neon, Stripe, Telegram...)
- `04_APRENDIZAJES.md` — Errores, decisiones, qué funcionó

### **Capa 2: Datos**
Mapa vivo de todas las fuentes de datos. Cada cambio se registra.

```
Business OS → Neon (BD, Enterprise Brain)
           → Stripe (ingresos)
           → Telegram (comandos)
           → Groq (STT)
           → ElevenLabs (TTS)
           → Gmail (email)
           → Google Calendar (agenda)
           → SQLite del agente (memoria persistente)
```

### **Capa 3: Inteligencia**
9 agentes especializados que razonan sobre el contexto real:

1. **Decision Engine** — Sintetiza contexto + datos + decisiones pasadas
2. **Ventas & Outreach** — Gestión de prospectos y cierre
3. **Finanzas** — MRR, ROI, presupuesto
4. **Producto** — Roadmap, features, bugs
5. **Marketing** — Campañas, contenido, analítica
6. **Operaciones** — Automatización, procesos, alertas
7. **RH & Equipo** — Talent, cultura, 1-on-1s
8. **Legal & Compliance** — Riesgos, regulación
9. **Auditoría Interna** — Health check del sistema

Cada agente tiene acceso a:
- Todo el contexto de `context/`
- Datos en vivo desde las fuentes
- Memoria del agente (conversaciones previas)
- Reglas de oro (lo que sí/no puede hacer)

### **Capa 4: Automatización**
Crons inteligentes que corren sin intervención:

```
⏰ Diario (7:00 AM CST)
   └─ Morning briefing: resumen de métricas, alertas, prioridad del día

⏰ Semanal (domingo 18:00 CST)
   └─ Revisión semanal: auditoría vs. objetivos, nuevo foco, aprendizajes

⏰ Personalizado
   └─ Seguimiento de leads, análisis de competencia, ideas de contenido...
   └─ (Definidos en tu onboarding)
```

Cada cron:
- Genera reporte/acción
- Lo registra en memoria del agente
- Actualiza el contexto si es necesario
- Alerta por Telegram si algo es crítico

### **Capa 5: Build**
Con las capas 1–4 vivas, construye sobre ellas.

Ejemplos:
- Integra Zapier/n8n para workflows custom
- Agrega un sitio público que consulte el Brain en vivo
- Crea un dashboard de analítica conectado a tus datos
- Expande a nuevos canales (WhatsApp, Slack, Discord)

---

## 🏗️ Arquitectura Técnica

```
business-os/                 # Enterprise Brain (Next.js 16 + Neon)
├── src/app/                 # 9 páginas: empresa, estrategia, KPIs, etc.
├── src/api/                 # APIs REST: agents, knowledge, roi, health...
└── db/                      # Schema Neon + 9 agentes sembrados

agent-server/                # Agente persistente (Claude Agent SDK)
├── src/index.ts             # Daemon del agente + Telegram bot
├── src/schedule-cli.ts      # CLI para gestionar crons
├── store/                   # SQLite con memoria + scheduled_tasks
└── scripts/                 # seed-crons.ts, status.ts, health checks

finance-os/                  # Dashboard financiero (Next.js 16)
├── src/app/                 # Gastos, ingresos, ROI, presupuesto
└── src/api/                 # Integración con Neon + Stripe

Mission-Control/             # Dashboard de tareas (Next.js 16 + Supabase)
├── src/                     # Tablero, chat, historial de acciones
└── src/api/                 # Tareas, chat, auditoría

context/                     # Capa 1: Contexto (GIT-tracked)
├── 00_EMPRESA.md            # Identidad ({{ASI:...}} si no configurado)
├── 01_ESTRATEGIA.md         # Objetivos
├── 02_REGLAS_DE_ORO.md      # Reglas vinculantes
├── 03_DATOS.md              # Mapa de fuentes
└── 04_APRENDIZAJES.md       # Registro cronológico

automations/
└── cronjobs-seed.json       # 16 crons listos (se siembran con seed-crons.ts)

.claude/
└── skills/                  # Skills del sistema (onboarding, briefing, etc.)
```

---

## 📋 Estado (después de onboarding)

Una vez encendido, tu Business OS reporta:

```
SALUD DEL SISTEMA
├─ Enterprise Brain (Neon)         🟢 Conectado
├─ Cron jobs                       🟢 Corriendo
├─ Agent Server (Telegram bot)     🟢 En línea
├─ Memoria SQLite del agente       🟢 15+ cronjobs sembrados
├─ Stripe / Polar (ingresos)       🟡 No conectado (pendiente de tu API key)
├─ Gmail / Google Drive            🟡 No conectado (pendiente de OAuth)
└─ Base de datos de clientes       🟢 Creada

MÉTRICAS CLAVE (en vivo)
├─ Métrica norte                   XX (tu objetivo)
├─ Objetivo 90 días                XX%
├─ Foco semanal                    [Auto-actualizado cada domingo]
└─ Alertas críticas                [Por Telegram si hay algo urgente]
```

---

## 💡 Ejemplos de uso

### Escenario 1: Agencia de marketing (tú)
```
Morning briefing (7 AM): "Tienes 3 leads nuevos, MRR subió 8%, 
la revisión semanal está lista, prioridad hoy: seguimiento de 
leads de la semana pasada."

Tú: "Quién es el lead más caliente?"
IA: [consulta Neon/CRM] → "ABC Corp, presupuesto $50k, 
decision en 3 días, quieren demo mañana."

Tú: "Prepara la propuesta"
IA: [usa templates + datos de contratos pasados] → 
"Propuesta de $45k con 3 entregas (landing + blog + caso de 
estudio). ¿Envío?"

Tú: "Sí, con nota personalizada"
IA: [redacta, registra en CRM, archiva] → 
"Enviado. Seguimiento automático en 48h."
```

### Escenario 2: SaaS (tú)
```
Revisión semanal (domingo 6 PM):
"Métrica norte: 42 MAU (objetivo 50). Churn semanal 2.1% vs. 
target 1%. Tres features en roadmap atrasadas. Ticket 
promedio subió a $450/mes. Recomendación: foco esta semana 
en reducción de churn — hazlo y hit el target."

Tú: "Qué está causando churn?"
IA: [analiza NPS, cancellations, product telemetry] → 
"Falta feature de export en plan Free. 40% de quienes se van 
lo mencionan. Costo de dev: 2 sprints. ROI positivo en mes 1."

Tú: "Agrégalo a esta semana"
IA: [actualiza roadmap, comunica al equipo por Slack] → Done
```

---

## 🔐 Seguridad & Privacidad

- **Credenciales:** En `.env.local` (no en git, nunca commiteadas)
- **Datos sensibles:** En Neon (DB privada) o SQLite del agente
- **Comunicación:** Solo vía Telegram (canal privado del piloto)
- **Tokens:** Rotados automáticamente si hay cambios
- **Auditoría:** Todo queda registrado en `context/04_APRENDIZAJES.md`

---

## 🛠️ Stack

| Layer | Tech |
|---|---|
| **Frontend** | Next.js 16, React, Tailwind CSS |
| **Backend** | Node.js, TypeScript, Claude Agent SDK |
| **DB** | Neon (Postgres serverless) + SQLite local (agente) |
| **AI** | Claude 3.5 Sonnet, Claude 3 Haiku |
| **Voice** | Groq (STT), ElevenLabs (TTS) |
| **Integrations** | Telegram, Gmail, Google Calendar, Stripe, Polar |
| **Deploy** | Vercel (apps), VPS/Docker (agent-server) |

---

## 📖 Documentación Completa

- **[ENCENDIDO.md](ENCENDIDO.md)** — Guía paso a paso para pilotos nuevos
- **[CLAUDE.md](CLAUDE.md)** — Instrucciones del sistema (para Claude Code)
- **[context/README.md](context/README.md)** — Explicación de cada archivo de contexto

---

## 🤝 Soporte & Comunidad

Este es un **sistema abierto** — puedes:

- Crear tu propia skill en `.claude/skills/`
- Extender los 9 agentes con nuevos roles
- Conectar nuevas fuentes de datos
- Crear crons personalizados

**Pregunta:** ¿Cómo agrego una integración nueva?  
→ Ver `docs/SETUP_PROMPT.md` (sección "MCP Servers")

---

## 📄 Licencia

Este proyecto es de código abierto. Úsalo, clónalo, customízalo para tu empresa.

---

## 🚀 Próximos pasos

1. **Clona este repo**
2. **Abre Claude Code en la carpeta**
3. **Di "Enciende el sistema"**
4. **Responde 5 preguntas sobre tu empresa**
5. **Comienza a operar tu negocio en 30 minutos**

---

**¿Preguntas?** Abre un issue o consulta [ENCENDIDO.md](ENCENDIDO.md).

**Made with ❤️ by the Business OS team** — Operando negocios con IA desde 2026.

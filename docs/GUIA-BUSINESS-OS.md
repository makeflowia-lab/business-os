# 🧭 Guía Paso a Paso del Business OS — De cero a "es mío"

> Guía paso a paso para montar **tu propio Business OS** y adaptarlo a tu negocio.
> Sin teoría de relleno. Haces lo que dice, en orden, y funciona.
>
> **Tiempo estimado:** 15–30 minutos (la primera vez).

---

## 0. ¿Qué vas a tener al final?

Tu propio sistema operativo de negocio con IA. Son **3 piezas** que funcionan juntas o por separado. **No necesitas las 3.** Empieza por la que te haga falta:

| Pieza | Qué es | Dónde vive | ¿La necesito? |
|-------|--------|------------|----------------|
| **Mission Control** | Panel web (tablero Kanban, chat con IA, actividad, calendario, cron). Se instala en el móvil como app (PWA). | Navegador / Vercel | Si quieres un dashboard visual para mandar tareas y ver qué pasa. |
| **Agent Server** | Tu agente de IA permanente. Le hablas por **Telegram** y ejecuta el Claude Code real en tu máquina, con tus herramientas, memoria y voz. | Tu ordenador | Si quieres hablar con tu IA desde el móvil y que recuerde quién eres. |
| **Finance OS** | Gestor de finanzas personales (ingresos, gastos, recurrentes, reportes, un "CFO" con IA). | Navegador / Vercel | Si quieres llevar tus números. |

> 💡 **Regla de oro para empezar:** elige **una sola pieza** la primera vez. Cuando la tengas viva, añades las demás. Intentar las tres a la vez es la causa nº1 de atascarse.

---

## 0.1 — Lo que necesitas antes de empezar (requisitos)

Marca cada casilla antes de seguir. Si falta una, párate y resuélvela:

- [ ] **Node.js 20 o superior.** Compruébalo: abre una terminal y escribe `node -v`. Si sale `v20.x` o mayor, vas bien. Si no, instálalo desde [nodejs.org](https://nodejs.org).
- [ ] **Git instalado.** Compruébalo: `git -v`.
- [ ] **Claude Code CLI instalado y con sesión iniciada** (solo si vas a usar Agent Server). Compruébalo: escribe `claude` en la terminal. Si abre, perfecto.
- [ ] **Cuenta en Supabase** (gratis) — para Mission Control y/o Finance OS. [supabase.com](https://supabase.com)
- [ ] **Cuenta de Telegram** (solo para Agent Server). Para crear el bot tardas 2 minutos.

> 🪟 **Nota Windows:** todo funciona. Lo único que cambia es la instalación del servicio en segundo plano (se hace con PM2 en vez de launchd/systemd). Lo verás en el Paso 3.

---

# PASO 1 — Configuración inicial (bajarlo, configurarlo, dónde ponerlo)

## 1.1 — Clona el repositorio

Abre una terminal **en la carpeta donde quieras guardar el proyecto** (ej: tu carpeta de proyectos) y ejecuta:

```bash
git clone <URL-DEL-REPO-BUSINESS-OS> business-os
cd business-os
```

> 📁 **¿Dónde ponerlo?** Donde sueles tener tus proyectos. No en el Escritorio ni en Descargas. Una ruta **sin espacios ni acentos** es lo más seguro (ej: `C:\proyectos\business-os` o `~/proyectos/business-os`).

## 1.2 — La forma fácil: deja que la IA te instale

Aquí está el truco que casi nadie usa. El proyecto trae un **mega-prompt de instalación** que convierte a Claude Code en tu asistente de setup. Te entrevista, crea la base de datos, configura las claves y te deja todo funcionando.

**Mac / Linux / Windows (con Claude Code instalado):**

```bash
# 1. Abre Claude Code dentro de la carpeta del proyecto
claude

# 2. Dile literalmente esto:
```
> "Lee `docs/SETUP_PROMPT.md` y configúrame el Business OS paso a paso."

A partir de ahí, **Claude te guía**. Te preguntará qué piezas quieres, te pedirá las claves una a una y ejecutará la instalación. Si te atascas en cualquier punto, **le preguntas dentro del mismo chat** ("¿de dónde saco el token de Telegram?") y te lo explica sin perder el hilo.

> ✅ **Esta es la vía recomendada.** El resto de pasos de abajo son por si prefieres hacerlo a mano o entender qué pasa por dentro.

---

## 1.3 — La forma manual (si quieres entenderlo todo)

### A) Crea la base de datos en Supabase

1. Entra en [supabase.com](https://supabase.com) y crea un proyecto nuevo (gratis).
2. Cuando cargue, ve a **Settings → API** y copia 3 cosas (las usarás en el siguiente paso):
   - **Project URL**
   - **anon key** (pública)
   - **service_role key** (secreta — no la compartas)
3. Ve al **SQL Editor** (icono de base de datos en el menú izquierdo).
4. Abre el archivo `docs/SETUP_PROMPT.md` del proyecto:
   - Para **Mission Control** → copia el bloque SQL de la **Sección 3A**.
   - Para **Finance OS** → copia el bloque SQL de la **Sección 3B**.
5. Pega ese SQL en el editor de Supabase y pulsa **Run**. Esto crea todas las tablas de golpe.
6. Verifica en **Table Editor** que aparecieron las tablas.

> 🔎 **Checkpoint:** si ves las tablas listadas en el Table Editor, esta parte está hecha.

### B) Configura las variables de entorno (las "claves")

Cada pieza tiene su archivo de configuración. Copias la plantilla y rellenas tus datos.

**Mission Control:**
```bash
cd Mission-Control
cp .env.example .env.local
```
Edita `.env.local` y rellena:
```env
NEXT_PUBLIC_SUPABASE_URL=<tu Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu anon key>
SUPABASE_SERVICE_ROLE_KEY=<tu service_role key>
ALLOWED_EMAILS=<tu-email@ejemplo.com>          # solo estos emails podrán entrar
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Finance OS:**
```bash
cd finance-os
cp .env.example .env.local
```
```env
NEXT_PUBLIC_SUPABASE_URL=<tu Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu anon key>
SUPABASE_SERVICE_ROLE_KEY=<tu service_role key>
OPENROUTER_API_KEY=<opcional, para el CFO con IA>
```

**Agent Server:**
```bash
cd agent-server
cp .env.example .env
```
```env
TELEGRAM_BOT_TOKEN=<lo obtienes en el Paso 2>
ALLOWED_CHAT_ID=<lo rellenas tras el primer mensaje al bot>
SCHEDULER_TZ=Europe/Madrid                      # tu zona horaria
# Opcionales (voz):
GROQ_API_KEY=<voz a texto, gratis en console.groq.com>
ELEVENLABS_API_KEY=<respuestas habladas, gratis en elevenlabs.io>
ELEVENLABS_VOICE_ID=<voz elegida en ElevenLabs>
```

> 🔐 **Si conectas Mission Control + Agent Server:** ambos necesitan compartir el mismo secreto. En `Mission-Control/.env.local` pon `OPENCLAW_GATEWAY_TOKEN=...` y en `agent-server/.env` pon `MISSION_CONTROL_TOKEN=...` **con el mismo valor**. Genera uno aleatorio: en Mac/Linux `openssl rand -hex 32`; en Windows usa cualquier cadena larga al azar.

### C) Instala dependencias y arranca

Para cada pieza que vayas a usar:

```bash
# Mission Control
cd Mission-Control && npm install && npm run dev      # abre http://localhost:3000

# Finance OS
cd finance-os && npm install && npm run dev           # abre http://localhost:3001

# Agent Server
cd agent-server && npm install && npm run dev
```

> 🔎 **Checkpoint:** Mission Control debe mostrarte una pantalla de login en `localhost:3000`. Entra con el email que pusiste en `ALLOWED_EMAILS`.

---

# PASO 2 — Conexión de áreas principales (hacerlo TUYO)

Aquí es donde el sistema deja de ser "una demo" y pasa a ser **tu** Business OS.

## 2.1 — El cerebro: personaliza `CLAUDE.md`

Este es **el archivo más importante**. Es el "prompt de sistema" de tu IA: se carga cada vez que arranca y define quién eres, qué haces y cómo quieres que te trate. Está en la raíz del proyecto.

Ábrelo y personaliza estas secciones:

1. **Tu Rol** — qué quieres que sea la IA para ti: ¿socio estratégico? ¿gestor de operaciones? ¿programador? Descríbelo.
2. **El Ecosistema** — borra del diagrama las piezas que no uses.
3. **Comandos clave** — quita los comandos de las piezas que no instalaste.
4. **Reglas** — tu estilo: ¿directo y conciso? ¿con datos siempre? ¿en español?

> 💡 **Cuanto más contexto le des, más útil es.** Cuéntale tu negocio, tus valores, tus herramientas, tus manías. No es perder el tiempo: es lo que diferencia un chatbot genérico de **tu** copiloto.

**Ejemplo de personalización del bloque "Tu Rol":**
```markdown
## Tu Rol
Eres mi jefe de operaciones. Llevo una [tu negocio]. Cada mañana
revisas mis tareas pendientes, me señalas la de mayor impacto y me
dices la verdad aunque no me guste. Hablas en español, directo, sin rodeos.
```

## 2.2 — Conecta el Bot de Telegram (Agent Server)

Esto te da una IA en el bolsillo. (Salta este punto si no usas Agent Server.)

1. Abre Telegram y busca **@BotFather**.
2. Envía `/newbot`.
3. Ponle un nombre (ej: "Mi Asistente").
4. Ponle un usuario que **termine en `bot`** (ej: `mi_asistente_bot`).
5. BotFather te da un **token** tipo `1234567890:ABCdef...`. Cópialo.
6. Pégalo en `agent-server/.env` como `TELEGRAM_BOT_TOKEN`.

**Conseguir tu Chat ID:**

1. Arranca el servidor: `cd agent-server && npm run dev`.
2. En Telegram, envía `/chatid` a tu bot.
3. El bot te responde con un número (tu chat ID).
4. Pégalo en `agent-server/.env` como `ALLOWED_CHAT_ID`.
5. Reinicia el servidor.

> 🔒 **Por qué importa `ALLOWED_CHAT_ID`:** el bot **solo** te responde a ti. Cualquier otra persona que le escriba es rechazada. Es tu candado de seguridad.

> 🔎 **Checkpoint:** escríbele "hola" a tu bot. Si te contesta, está vivo. Si tienes voz activada, mándale una nota de voz y debería transcribirla y responder.

## 2.3 — Conecta Mission Control con tu agente

Si quieres mandar órdenes a tu IA desde el dashboard web (no solo desde Telegram):

1. Asegúrate de que `OPENCLAW_GATEWAY_TOKEN` (en Mission-Control) y `MISSION_CONTROL_TOKEN` (en agent-server) **tienen el mismo valor**.
2. En `Mission-Control/.env.local` confirma `AGENT_URL=http://localhost:3099`.
3. Arranca ambos (`npm run dev` en cada carpeta).
4. Entra al dashboard → pestaña **Chat** → escribe algo. La respuesta viene de tu Agent Server.

## 2.4 — Adapta Finance OS a tus cuentas

Si usas Finance OS, las cuentas bancarias de ejemplo no son las tuyas:

1. Edita `finance-os/src/features/finances/types/index.ts` (el array `CUENTAS`) y pon tus cuentas reales.
2. Actualiza la tabla `cuentas` en Supabase con esos mismos nombres.

---

# PASO 3 — Sacarle el jugo en el día a día

Ya lo tienes vivo. Ahora, cómo se usa de verdad.

## 3.1 — Que arranque solo (servicio en segundo plano)

Para que tu agente esté disponible siempre, sin tener que arrancarlo a mano:

**🪟 Windows (PM2):**
```bash
npm install -g pm2
cd agent-server
npm run build
pm2 start dist/index.js --name agent-server
pm2 save
pm2 startup        # sigue las instrucciones que imprime
```

**🍎 macOS (launchd) / 🐧 Linux (systemd):**
Pídeselo a Claude Code: *"Instálame el Agent Server como servicio en segundo plano para que arranque al encender el ordenador"*. Genera el archivo correcto (`.plist` o `.service`) y lo activa. Los detalles están en `docs/SETUP_PROMPT.md`, Sección 8.

> 🔎 **Comprobar que sigue vivo:** `cd agent-server && npx tsx scripts/status.ts`

## 3.2 — Tareas programadas (cron): tu IA trabaja sola

Tu agente puede ejecutar tareas a solas y mandarte el resultado por Telegram. Ejemplos: resumen cada mañana, revisión de salud del sistema los lunes.

**Crear una tarea programada:**
```bash
cd agent-server
npx tsx src/schedule-cli.ts create "Hazme un resumen de mis tareas pendientes y dime la más importante" "0 9 * * *" TU_CHAT_ID
```
> `"0 9 * * *"` = todos los días a las 9:00. (Formato cron estándar.)

**Gestionar tareas:**
```bash
npx tsx src/schedule-cli.ts list           # ver todas
npx tsx src/schedule-cli.ts run <id>       # ejecutar ya
npx tsx src/schedule-cli.ts pause <id>     # pausar
npx tsx src/schedule-cli.ts resume <id>    # reanudar
```

## 3.3 — El tablero Kanban como centro de mando

En Mission Control, el tablero no es decorativo:
- Creas tareas, las arrastras entre columnas (Inbox → En progreso → Revisión → Hecho).
- Puedes asignárselas a tu agente.
- La pestaña **Actividad** te muestra en tiempo real cada conversación que tu agente tuvo (incluidas las del cron).

## 3.4 — La memoria: por qué mejora con el tiempo

Tu Agent Server **aprende quién eres**. Cuando dices cosas como "mi empresa…", "prefiero…", "recuerda que…", lo guarda como memoria a largo plazo. En cada mensaje, busca recuerdos relevantes y los inyecta antes de responder. Cuanto más lo usas, mejor te conoce. No tienes que hacer nada especial: solo háblale con naturalidad.

> 🆕 ¿Quieres empezar una conversación limpia (sin el contexto anterior)? Envía `/newchat` al bot.

## 3.5 — Flujo de trabajo recomendado (el día típico)

1. **Mañana:** el cron de las 9:00 te manda el resumen por Telegram. Lees, decides.
2. **Durante el día:** le hablas al bot por voz o texto para crear tareas, pedir análisis, redactar cosas. Desde el móvil, en cualquier sitio.
3. **Planificación:** abres Mission Control, organizas el Kanban, miras la actividad.
4. **Finanzas:** registras gastos en Finance OS y le pides al CFO con IA que analice tus patrones.
5. **El sistema mejora solo:** cada vez te conoce más y necesitas explicarle menos.

---

# 🆘 Si te atascas

**La mejor herramienta de soporte ya la tienes instalada: Claude Code.** Ábrelo dentro del proyecto y pregunta directamente:

- *"El build falló con este error: [pega el error]. ¿Qué hago?"*
- *"¿De dónde saco la service_role key de Supabase?"*
- *"Quiero añadir una tarea programada que haga X cada lunes."*
- *"Quita Finance OS de mi instalación, solo quiero Mission Control."*

El proyecto está diseñado para que **la propia IA sea tu soporte técnico**. No estás solo a las 11 de la noche peleándote con un error.

---

# ✅ Checklist final

- [ ] Repo clonado en una ruta limpia.
- [ ] Base de datos creada en Supabase (tablas visibles).
- [ ] `.env` de cada pieza relleno.
- [ ] `CLAUDE.md` personalizado con tu contexto.
- [ ] (Opcional) Bot de Telegram respondiendo solo a ti.
- [ ] (Opcional) Mission Control y Agent Server conectados.
- [ ] (Opcional) Servicio en segundo plano activo.
- [ ] (Opcional) Primera tarea programada creada.

**Si marcaste lo esencial, ya tienes tu propio Business OS. El resto es adaptarlo a ti.**

---

*Guía Paso a Paso del Business OS · "De la demo a 'es mío' en una tarde."*

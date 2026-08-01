# 🎬 Guion de Vídeo — Business OS: De cero a "es mío"

> **Formato:** screencast (pantalla grabada) + voz en off, con algún plano a cámara opcional.
> **Duración objetivo:** 12–16 min.
> **Enfoque:** que cualquiera monte SU PROPIO Business OS y lo adapte. No es tu instalación: es la de ellos.
> **Regla de oro:** muestra los "checkpoints" (la pantalla que confirma que va bien). Eso es lo que tranquiliza a quien sigue el tutorial.
>
> **Leyenda:**
> 🎬 `EN PANTALLA` = qué se ve · 🎙️ `NARRACIÓN` = lo que dices · 💬 `OVERLAY` = texto sobreimpreso · ⏱️ = duración aprox.

---

## ESCENA 0 — Gancho (0:00 – 0:35) · ⏱️ 35s

🎬 **EN PANTALLA:** A cámara o pantalla con el título "Tu propio Business OS, desde cero".

🎙️ **NARRACIÓN:**
> "Has visto las clases, has visto los vídeos, pero no terminas de aterrizar cómo instalar y aprovechar el Business OS. Esto es una guía paso a paso, sin teoría de relleno. Al final del vídeo vas a tener tu propio Business OS funcionando y adaptado a ti. Y un secreto desde ya: la mejor herramienta para instalarlo viene dentro del propio proyecto."

💬 **OVERLAY:** `3 piezas · elige las que necesitas · adáptalo a tu negocio`

---

## ESCENA 1 — Qué vas a tener y la regla de oro (0:35 – 2:00) · ⏱️ 1m25s

🎬 **EN PANTALLA:** Tabla de las 3 piezas (puede ser la de la guía paso a paso en HTML en pantalla).

🎙️ **NARRACIÓN:**
> "El Business OS son tres piezas, y lo primero que tienes que saber es que NO necesitas las tres. Mission Control es un panel web con tablero, chat y actividad, que se instala en el móvil como una app. Agent Server es tu agente de IA permanente: le hablas por Telegram y ejecuta Claude Code de verdad en tu máquina, con memoria y con voz. Y Finance OS lleva tus finanzas. La regla de oro para no atascarte: la primera vez, elige UNA sola pieza. Cuando la tengas viva, añades las demás. Querer las tres a la vez es la causa número uno de frustración."

💬 **OVERLAY:** `🟦 Mission Control · 🟩 Agent Server · 🟨 Finance OS` → `Empieza por UNA`

---

## ESCENA 2 — Requisitos en 60 segundos (2:00 – 3:00) · ⏱️ 1m

🎬 **EN PANTALLA:** Terminal. Ir tecleando cada comprobación.

🎙️ **NARRACIÓN:**
> "Comprobemos que tienes lo necesario. Node 20 o superior..."

🎬 **EN PANTALLA:**
```bash
node -v
git -v
claude
```

🎙️ **NARRACIÓN:**
> "...Git, y Claude Code instalado y con sesión iniciada, que lo vamos a necesitar. Aparte, una cuenta gratis en Supabase para la base de datos, y una cuenta de Telegram si quieres el agente. Si estás en Windows, tranquilo, todo funciona; lo único distinto es cómo se deja corriendo el agente en segundo plano, y te lo enseño al final."

💬 **OVERLAY:** `Node 20+ · Git · Claude Code · Supabase (free) · Telegram`

---

## ESCENA 3 — Paso 1: clonar y la forma fácil (3:00 – 6:00) · ⏱️ 3m

🎬 **EN PANTALLA:** Terminal en la carpeta de proyectos.
```bash
git clone <URL-DEL-REPO-BUSINESS-OS> business-os
cd business-os
```

🎙️ **NARRACIÓN:**
> "Clono el repositorio. Un consejo: ponlo en una ruta limpia, sin espacios ni acentos. No en el Escritorio ni en Descargas. Y ahora, el truco que casi nadie usa y que lo cambia todo."

🎬 **EN PANTALLA:**
```bash
claude
```
Escribir en Claude Code:
> `Lee docs/SETUP_PROMPT.md y configúrame el Business OS paso a paso`

🎙️ **NARRACIÓN:**
> "El proyecto trae un mega-prompt de instalación. Le digo a Claude que lo lea, y a partir de aquí Claude se convierte en mi asistente de setup. Me va a preguntar qué piezas quiero, me va a pedir las claves una a una, va a crear la base de datos por mí y me va a dejar todo funcionando. Y lo mejor: si me atasco en cualquier punto, le pregunto AHÍ MISMO, en el mismo chat."

🎬 **EN PANTALLA:** Mostrar a Claude haciendo la pregunta de qué componentes. Responder eligiendo, por ejemplo, solo Agent Server (para el ejemplo). Mostrar cómo pregunta por las claves.

🎙️ **NARRACIÓN (ejemplo de duda en vivo):**
> "Mira, le pregunto algo que seguramente tú también te preguntas..."

🎬 **EN PANTALLA:** Escribir a Claude:
> `¿De dónde saco el token de Telegram?`

🎙️ **NARRACIÓN:**
> "Y me lo explica sin perder el hilo de la instalación. Esto es lo que quiero que te lleves: el soporte técnico está dentro del propio proyecto."

💬 **OVERLAY:** `El instalador es la propia IA. Pregúntale lo que sea.`

---

## ESCENA 4 — Paso 1 (alternativa): mirar qué pasa por dentro (6:00 – 7:30) · ⏱️ 1m30s

🎙️ **NARRACIÓN:**
> "Para los curiosos, esto es lo que la IA hace por debajo, por si lo quieres entender. Crea un proyecto en Supabase, copia tres claves de Settings, API, y ejecuta un bloque de SQL que crea todas las tablas de golpe. Y rellena los archivos punto-env de cada pieza. No tienes que hacerlo a mano, pero saber que existe te quita el miedo."

🎬 **EN PANTALLA:** Mostrar brevemente el Supabase SQL Editor con tablas creadas (Table Editor). Mostrar un `.env` con valores tapados.

💬 **OVERLAY:** `🔎 Checkpoint: si ves las tablas en Supabase, vas bien`

---

## ESCENA 5 — Paso 2: el cerebro, CLAUDE.md (7:30 – 9:30) · ⏱️ 2m

🎬 **EN PANTALLA:** Abrir `CLAUDE.md` en el editor.

🎙️ **NARRACIÓN:**
> "Aquí es donde el sistema deja de ser una demo y pasa a ser TUYO. Este archivo, CLAUDE.md, es el cerebro. Es el prompt de sistema que tu IA carga cada vez que arranca. Le dice quién eres, qué haces y cómo quieres que te trate. Voy a personalizar el rol."

🎬 **EN PANTALLA:** Escribir en CLAUDE.md:
```markdown
## Tu Rol
Eres mi jefe de operaciones. Llevo una [tu negocio]. Cada mañana
revisas mis tareas, me señalas la de mayor impacto y me dices la
verdad aunque no me guste. Hablas en español, directo, sin rodeos.
```

🎙️ **NARRACIÓN:**
> "Cuanto más contexto le metas — tu negocio, tus valores, tus herramientas, tus manías — más útil es. Esto es lo que diferencia un chatbot genérico de TU copiloto. Tómate este archivo en serio."

💬 **OVERLAY:** `CLAUDE.md = el cerebro. Personalízalo a fondo.`

---

## ESCENA 6 — Paso 2: conectar Telegram (9:30 – 11:30) · ⏱️ 2m

🎬 **EN PANTALLA:** Telegram → buscar @BotFather.

🎙️ **NARRACIÓN:**
> "Vamos a darle a tu IA un cuerpo en el móvil. Abro Telegram, busco BotFather, y mando newbot."

🎬 **EN PANTALLA:** `/newbot` → nombre → usuario terminado en `bot` → copia el token.

🎙️ **NARRACIÓN:**
> "Le pongo nombre, un usuario que termine en bot, y me da un token. Ese token lo pego en el archivo punto-env del agent-server. Ahora arranco el servidor y le pido al bot mi Chat ID."

🎬 **EN PANTALLA:**
```bash
cd agent-server && npm run dev
```
En Telegram: `/chatid` → copiar el número → pegar en `.env` como `ALLOWED_CHAT_ID` → reiniciar.

🎙️ **NARRACIÓN:**
> "Pego ese número como ALLOWED_CHAT_ID y reinicio. ¿Por qué importa? Porque ese candado hace que el bot SOLO te responda a ti. Cualquier otro que le escriba, rechazado."

🎬 **EN PANTALLA:** Escribir "hola" al bot y mostrar la respuesta. Opcional: mandar una nota de voz.

💬 **OVERLAY:** `🔒 ALLOWED_CHAT_ID = el bot solo te responde a TI`
💬 **OVERLAY (checkpoint):** `🔎 ¿Te contesta? Está vivo.`

---

## ESCENA 7 — Paso 3: el día a día (11:30 – 14:30) · ⏱️ 3m

### 7A — Tareas programadas (cron)

🎙️ **NARRACIÓN:**
> "Ya lo tienes vivo. Ahora a sacarle el jugo. Lo más potente: tu IA puede trabajar sola y mandarte el resultado por Telegram. Por ejemplo, un resumen cada mañana a las nueve."

🎬 **EN PANTALLA:**
```bash
cd agent-server
npx tsx src/schedule-cli.ts create "Hazme un resumen de mis tareas pendientes y dime la más importante" "0 9 * * *" TU_CHAT_ID
npx tsx src/schedule-cli.ts list
```

🎙️ **NARRACIÓN:**
> "Ese 0 9 asterisco asterisco asterisco significa todos los días a las nueve. Ya está. Mañana a las nueve me llega solo."

### 7B — La memoria

🎙️ **NARRACIÓN:**
> "Y algo que va a hacer que cada día funcione mejor: la memoria. Cuando le dices cosas como 'mi empresa', 'prefiero', 'recuerda que', tu agente lo guarda a largo plazo. Cuanto más lo usas, mejor te conoce, y menos tienes que explicarle. No tienes que hacer nada especial: háblale con naturalidad."

### 7C — Que arranque solo (background)

🎙️ **NARRACIÓN:**
> "Por último, para que el agente esté siempre disponible sin arrancarlo a mano. En Windows se hace con PM2..."

🎬 **EN PANTALLA (Windows):**
```bash
npm install -g pm2
cd agent-server
npm run build
pm2 start dist/index.js --name agent-server
pm2 save
```

🎙️ **NARRACIÓN:**
> "...y en Mac o Linux, simplemente le pides a Claude Code que te lo instale como servicio de arranque y lo hace por ti. Otra vez: el soporte está dentro."

💬 **OVERLAY:** `🪟 Windows: PM2 · 🍎🐧 Mac/Linux: pídeselo a Claude`

---

## ESCENA 8 — Cierre (14:30 – 15:30) · ⏱️ 1m

🎬 **EN PANTALLA:** El checklist final de la guía paso a paso, marcando casillas.

🎙️ **NARRACIÓN:**
> "Repasemos. Repo clonado, base de datos creada, claves puestas, el cerebro CLAUDE.md personalizado, el bot respondiéndote solo a ti, y una tarea programada lista. Si marcaste lo esencial, ya tienes TU Business OS. El resto es ir adaptándolo a ti. Y recuerda lo más importante de todo este vídeo: cuando te atasques, no estás solo a las once de la noche; abres Claude Code dentro del proyecto y le preguntas. Nos vemos en el siguiente."

💬 **OVERLAY:** `Tu soporte vive dentro del proyecto: Claude Code.`

---

## 📋 Checklist de grabación (para ti, antes de darle a REC)

- [ ] Terminal con fuente grande, tema legible (pensando en quien lo ve en el móvil).
- [ ] Proyecto Supabase creado y claves a mano (¡tapar en pantalla!).
- [ ] Bot de Telegram listo para crear en directo (o uno de prueba ya hecho).
- [ ] Tapar/difuminar en posproducción: tokens, keys, emails, chat IDs.
- [ ] Decide de antemano qué pieza muestras (recomendado: Agent Server, es la más visual).
- [ ] Ten a mano la guía paso a paso (HTML) abierta para mostrar tablas/diagramas.

---

*Guion de vídeo · Business OS · "De la demo a 'es mío' en una tarde."*

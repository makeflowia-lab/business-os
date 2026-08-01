# 🎬 Guion de Vídeo — SaaS-Factory: De la Idea a Producción

> **Formato:** screencast (pantalla grabada) + voz en off.
> **Duración objetivo:** 12–15 min.
> **Ejemplo en vivo:** app de citas para una peluquería.
> **Regla de oro:** graba TODO de una sola pasada, sin cortes ocultos. El valor está en ver el proceso completo sin saltos.
>
> **Leyenda:**
> 🎬 `EN PANTALLA` = qué se ve · 🎙️ `NARRACIÓN` = lo que dices · 💬 `OVERLAY` = texto sobreimpreso · ⏱️ = duración aprox.

---

## ESCENA 0 — Gancho (0:00 – 0:30) · ⏱️ 30s

🎬 **EN PANTALLA:** Cara a cámara o pantalla negra con el título "De la idea a producción, sin saltos".

🎙️ **NARRACIÓN:**
> "Si has visto las clases pero no terminas de encajar las piezas, este vídeo es para ti. Vamos a ir de una idea en tu cabeza hasta una app real desplegada en internet. En una sola toma, sin cortes, sin magia. Lo que veas aquí lo puedes replicar tú esta misma tarde. La idea de hoy: una agenda de citas para una peluquería."

💬 **OVERLAY:** `Idea → saas-factory → /new-app → construir → GitHub → Vercel → 🚀`

---

## ESCENA 1 — La idea de fondo en 30 segundos (0:30 – 1:15) · ⏱️ 45s

🎬 **EN PANTALLA:** Diagrama simple (puede ser el bloque de la guía paso a paso): la analogía de la fábrica.

🎙️ **NARRACIÓN:**
> "Antes de tocar nada, entiende la filosofía, porque te ahorra mil dudas. SaaS-Factory es una fábrica de software. La analogía es la Tesla Factory: lo importante no es el coche, es la máquina que construye el coche. Tú decides QUÉ construir. La fábrica decide CÓMO, con un único stack ya perfeccionado: Next.js, React, Tailwind, Supabase y Vercel. No eliges tecnología, no te paralizas. Solo describes el negocio."

💬 **OVERLAY:** `Tú = el QUÉ · La fábrica = el CÓMO`

---

## ESCENA 2 — Instalar la fábrica una sola vez (1:15 – 2:45) · ⏱️ 1m30s

🎬 **EN PANTALLA:** Terminal limpia. Escribes los comandos en vivo.

🎙️ **NARRACIÓN:**
> "Esto se hace una sola vez en tu vida. Clonamos el repositorio de la fábrica."

🎬 **EN PANTALLA:** Teclear:
```bash
git clone https://github.com/daniel-carreon/saas-factory-setup.git
cd saas-factory-setup
claude .
```

🎙️ **NARRACIÓN (mientras Claude Code abre):**
> "Abro Claude Code dentro de la carpeta y le pido que me configure el atajo."

🎬 **EN PANTALLA:** Escribir en Claude Code:
> `Configura el alias saas-factory en mi terminal`

🎙️ **NARRACIÓN:**
> "Ese atajo, cuando lo ejecute más adelante, copia toda la infraestructura de la fábrica — el cerebro, los comandos, las herramientas — a la carpeta donde yo esté. Si estás en Windows con PowerShell, díselo a Claude y te da el equivalente; no es un alias, copia la carpeta."

💬 **OVERLAY:** `🪟 Windows: pídele a Claude el equivalente para PowerShell`

---

## ESCENA 3 — Definir la idea con /new-app (2:45 – 6:00) · ⏱️ 3m15s

🎬 **EN PANTALLA:** Crear el proyecto y meter la fábrica dentro.
```bash
mkdir peluqueria-citas
cd peluqueria-citas
saas-factory
```

🎙️ **NARRACIÓN:**
> "Creo la carpeta del proyecto, entro, y ejecuto saas-factory. Mira: acaba de copiar el proyecto completo aquí dentro. Ahora abro Claude Code y lanzo el comando estrella."

🎬 **EN PANTALLA:**
```bash
claude .
```
Escribir el comando:
> `/new-app`

🎙️ **NARRACIÓN:**
> "El comando new-app convierte a la IA en un consultor de negocio senior. No me va a pedir código. Me va a entrevistar, una pregunta a la vez, para sacar la esencia del negocio. Voy respondiendo de verdad, en directo."

🎬 **EN PANTALLA:** Responder las 7 preguntas conforme van saliendo. Lee tus respuestas en voz alta:

🎙️ **NARRACIÓN (responde a cada pregunta a medida que aparece):**
> 1. *El dolor:* "La peluquería pierde citas porque las apunta en un cuaderno y se le solapan."
> 2. *El costo:* "Dos o tres huecos vacíos al día por mala gestión."
> 3. *La solución, en una frase:* "Una agenda online de citas para peluquerías pequeñas."
> 4. *El flujo:* "El cliente elige servicio, ve los huecos libres, reserva, y recibe confirmación."
> 5. *El usuario:* "La dueña de la peluquería, que gestiona la agenda."
> 6. *Los datos:* "Entra el servicio, la fecha y los datos del cliente. Sale la agenda del día y los recordatorios."
> 7. *El éxito:* "Cero solapamientos y poder reservar en menos de un minuto."

🎙️ **NARRACIÓN (cuando termina y genera el archivo):**
> "Y aquí está la clave: con esas siete respuestas, la IA me genera un archivo, BUSINESS_LOGIC.md. Esto es la especificación técnica completa: las funcionalidades, las tablas de base de datos sugeridas y los próximos pasos. Lo abro, lo leo, y si me cuadra, lo apruebo. Este documento es el contrato entre lo que quiero y lo que la fábrica va a construir."

💬 **OVERLAY:** `Resultado: BUSINESS_LOGIC.md = el QUÉ, ya en lenguaje técnico`

🎬 **EN PANTALLA:** Abrir `BUSINESS_LOGIC.md` y hacer scroll mostrando las secciones.

---

## ESCENA 4 — Encender el "Cyborg": los MCPs (6:00 – 8:00) · ⏱️ 2m

🎬 **EN PANTALLA:** Terminal. Instalar y arrancar.
```bash
npm install
cp .env.local.example .env.local
npm run dev
```

🎙️ **NARRACIÓN:**
> "Instalo dependencias, copio el archivo de configuración y añado mis credenciales de Supabase. Ahora arranco el servidor. Y fíjate en esta línea de la salida, porque es lo que hace mágica a esta fábrica."

🎬 **EN PANTALLA:** Resaltar / hacer zoom a:
```
- MCP Server: http://localhost:3000/_next/mcp ✓
```

🎙️ **NARRACIÓN:**
> "Esto significa que la IA va a VER lo que construye. Tiene tres sentidos conectados: el de Next.js le deja leer los errores en tiempo real, el de Playwright le deja ver la pantalla como la verías tú, y el de Supabase le deja crear las tablas de la base de datos. Sin esto, la IA adivina. Con esto, ve exactamente qué está roto y por qué."

💬 **OVERLAY:** `🧠 Next.js (errores) · 👁️ Playwright (pantalla) · 🖐️ Supabase (base de datos)`

---

## ESCENA 5 — El bucle agéntico construye (8:00 – 11:00) · ⏱️ 3m

🎬 **EN PANTALLA:** Otra terminal con Claude Code. Escribir:
> `Implementa las features según BUSINESS_LOGIC.md`

🎙️ **NARRACIÓN:**
> "Una sola orden. Y ahora viene lo bonito: el bucle agéntico. La IA no se lanza a escribir todo de golpe. Primero divide el trabajo en fases: base de datos, autenticación, agenda, reservas. Antes de cada fase, explora qué hay realmente. Construye. Y si encuentra un error, lo arregla, lo prueba y lo documenta, para que ese mismo error no vuelva a pasar nunca. A eso lo llaman Auto-Blindaje."

🎬 **EN PANTALLA:** Dejar correr el bucle. Hacer time-lapse SOLO si es muy largo, pero mostrando que es continuo. Cuando cree tablas, mostrar Supabase. Cuando valide UI, mostrar el navegador.

🎙️ **NARRACIÓN (mientras trabaja):**
> "Mientras construye, mi trabajo es ser el control de calidad. Voy al navegador, en localhost 3000, y compruebo lo que importa de verdad: ¿puede la peluquería reservar una cita sin que se solape? Si algo no me gusta, se lo digo y lo ajusta en el momento."

🎬 **EN PANTALLA:** Abrir `localhost:3000`, hacer una reserva de prueba en vivo, mostrar que funciona.

💬 **OVERLAY:** `Tú eres el Control Room: la IA construye, tú validas`

---

## ESCENA 6 — Prueba de confianza del MCP (11:00 – 11:45) · ⏱️ 45s

🎙️ **NARRACIÓN:**
> "¿No te crees que la IA ve de verdad lo que pasa? Te lo demuestro. Rompo algo a propósito."

🎬 **EN PANTALLA:** En `src/app/page.tsx` añadir:
```typescript
const roto = undefined.foo  // 💥
```

🎙️ **NARRACIÓN:**
> "Y sin que yo le diga nada, la IA detecta el error exacto, con el archivo y la línea. Eso es tener ojos. Deshago el cambio y seguimos."

🎬 **EN PANTALLA:** Mostrar el error detectado, luego deshacer.

---

## ESCENA 7 — Subir a GitHub (11:45 – 13:00) · ⏱️ 1m15s

🎬 **EN PANTALLA:** github.com → New repository (sin README).

🎙️ **NARRACIÓN:**
> "La app funciona. Toca subirla. Creo un repositorio vacío en GitHub, sin README. Y desde la terminal subo el proyecto."

🎬 **EN PANTALLA:**
```bash
git init
git add .
git commit -m "Primera versión: agenda de citas para peluquería"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/peluqueria-citas.git
git push -u origin main
```

🎙️ **NARRACIÓN:**
> "Una cosa CRÍTICA: tu archivo punto-env-local nunca, jamás, sube a GitHub. La fábrica ya lo deja ignorado por defecto, pero compruébalo. Esas son tus claves. Y si te da pereza la terminal, también puedes pedirle a Claude que suba el repo por ti."

💬 **OVERLAY:** `⚠️ .env.local NUNCA sube a GitHub`

---

## ESCENA 8 — Desplegar en Vercel (13:00 – 14:30) · ⏱️ 1m30s

🎬 **EN PANTALLA:** vercel.com → Add New → Project → importar el repo.

🎙️ **NARRACIÓN:**
> "Y el último paso: producción. Entro en Vercel con mi cuenta de GitHub, importo el repositorio. Vercel reconoce solo que es Next.js, no toco nada del build. Lo único importante: añado las variables de entorno, las mismas tres de Supabase que tenía en local."

🎬 **EN PANTALLA:** Pegar las 3 variables:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```
Pulsar **Deploy**. Esperar la URL.

🎙️ **NARRACIÓN:**
> "Deploy. En un par de minutos tengo una URL pública. Y un ajuste que casi todo el mundo olvida y luego no entiende por qué falla el login: vuelvo a Supabase, a Authentication, URL Configuration, y añado mi nueva URL de Vercel. Si no haces esto, el login revienta en producción."

💬 **OVERLAY:** `No olvides: añadir la URL de Vercel a las Redirect URLs de Supabase`

---

## ESCENA 9 — Checkpoint final + cierre (14:30 – 15:00) · ⏱️ 30s

🎬 **EN PANTALLA:** Abrir la URL de Vercel EN EL MÓVIL. Reservar una cita de prueba en directo.

🎙️ **NARRACIÓN:**
> "El momento de la verdad. Abro la URL en el móvil, como lo haría un cliente real, y reservo una cita. Funciona. Eso es estar en producción. Acabamos de ir de una idea a una app real, desplegada en internet, sin saltos. Y lo más importante: esto no fue un truco mío, es un proceso que puedes repetir tú con cualquier idea. Nos vemos en el siguiente."

💬 **OVERLAY:** `De la idea a producción. Replicable. Tu turno.`

---

## 📋 Checklist de grabación (para ti, antes de darle a REC)

- [ ] Terminal con fuente grande y tema legible (zoom para que se lea en móvil).
- [ ] Proyecto Supabase ya creado y credenciales a mano (no las muestres en pantalla).
- [ ] Cuenta de GitHub y de Vercel con sesión iniciada.
- [ ] Tener `BUSINESS_LOGIC.md` ensayado mentalmente para responder las 7 preguntas fluido.
- [ ] Móvil listo para grabar la reserva final (o emulador).
- [ ] Tapar/difuminar cualquier token, key o email en posproducción.

---

*Guion de vídeo · SaaS-Factory · "Ver el proceso completo, sin saltos, es lo que marca la diferencia."*

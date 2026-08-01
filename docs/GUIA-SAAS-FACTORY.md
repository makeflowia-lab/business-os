# 🏭 Guía Paso a Paso de SaaS-Factory — De la Idea a Producción (End-to-End)

> El proceso completo, sin saltos, para que lo puedas replicar tú mismo.
> Vamos a construir un ejemplo sencillo de verdad y llevarlo hasta producción.
>
> **La promesa:** de la idea al despliegue siguiendo pasos numerados. Si lo haces en orden, sale.

---

## 0. La idea de fondo (en 30 segundos)

SaaS-Factory es una **fábrica de software**. La analogía es la Tesla Factory: lo importante no es el coche, es **la máquina que construye el coche**.

- Tú decides **QUÉ** construir.
- La fábrica (Claude Code + un stack fijo + herramientas que *ven* el código) decide **CÓMO**.
- Un solo stack perfeccionado ("Golden Path"): **Next.js 16 + React 19 + Tailwind + Supabase + Vercel**. Sin decisiones técnicas que te paralicen.

El flujo entero es:

```
Idea  →  saas-factory  →  /new-app  →  bucle agéntico (construir)  →  GitHub  →  Vercel  →  🚀
```

Vamos a recorrerlo entero con un ejemplo: **una app para que una peluquería gestione sus citas.** Sencilla, clara, replicable.

---

# FASE 1 — La Idea (definición rápida con IA)

No necesitas un documento de 40 páginas. Necesitas claridad en 7 respuestas. Pero antes, instala la fábrica.

## 1.1 — Instala SaaS-Factory una sola vez

1. Clona el repositorio de la fábrica:
   ```bash
   git clone https://github.com/daniel-carreon/saas-factory-setup.git
   cd saas-factory-setup
   ```
2. Abre Claude Code y pídele que configure el atajo:
   ```bash
   claude .
   ```
   > "Configura el alias `saas-factory` en mi terminal."

   Claude detecta tu sistema y crea el atajo. ¿Qué hace ese atajo? **Copia toda la infraestructura de la fábrica** (el cerebro `CLAUDE.md`, los comandos, los MCPs, el código base) a la carpeta donde estés.

   - **🍎🐧 Mac/Linux:** el alias es `cp -r .../saas-factory/. .`
   - **🪟 Windows (PowerShell):** en vez de alias, usarás una función o copiarás la carpeta `saas-factory\` a tu proyecto nuevo. Pídeselo a Claude: *"Estoy en Windows con PowerShell, dame el equivalente al alias saas-factory."*

## 1.2 — Define la idea con la IA (comando `/new-app`)

Crea la carpeta de tu proyecto y mete la fábrica dentro:

```bash
mkdir peluqueria-citas
cd peluqueria-citas
saas-factory          # (o el equivalente en Windows)
```

Abre Claude Code y lanza el comando de definición:

```bash
claude .
```
```
/new-app
```

Ahora Claude actúa como un **Consultor de Negocio Senior** y te entrevista **una pregunta a la vez**. No pide código: extrae la lógica de negocio. Las 7 preguntas:

| # | Pregunta | Ejemplo (peluquería) |
|---|----------|----------------------|
| 1 | **El Dolor** — ¿qué proceso está roto? | "Pierden citas porque las apuntan en un cuaderno y se solapan." |
| 2 | **El Costo** — ¿cuánto cuesta? | "2–3 huecos vacíos al día por mala gestión." |
| 3 | **La Solución** — en una frase | "Una agenda online de citas para peluquerías pequeñas." |
| 4 | **El Flujo** — paso a paso | "Cliente elige servicio → ve huecos libres → reserva → recibe confirmación." |
| 5 | **El Usuario** — el rol exacto | "La dueña de la peluquería que gestiona la agenda." |
| 6 | **Los Datos** — qué entra / qué sale | "Entra: servicio, fecha, datos del cliente. Sale: agenda del día, recordatorios." |
| 7 | **El Éxito (KPI)** — resultado medible | "Cero solapamientos y reservar en menos de 1 minuto." |

> 💡 **Responde concreto.** Si dices algo vago, la IA repregunta. Cuanto mejor respondas, mejor sale el resultado.

**Resultado de esta fase:** la IA genera un archivo `BUSINESS_LOGIC.md` en la raíz del proyecto. Es la especificación técnica completa: features, tablas de Supabase sugeridas, y los próximos pasos. **Léelo y apruébalo** antes de seguir.

---

# FASE 2 — El Desarrollo (el bucle agéntico)

Ya tienes el QUÉ (`BUSINESS_LOGIC.md`). Ahora la fábrica construye el CÓMO.

## 2.1 — Instala y enciende el "Cyborg" (los MCPs)

Lo que hace especial a esta fábrica es que la IA **ve** lo que construye, no adivina. Tres herramientas (MCPs):

| MCP | Rol | Superpoder |
|-----|-----|------------|
| 🧠 **Next.js DevTools** | Control de Calidad | Lee errores y logs en tiempo real |
| 👁️ **Playwright** | Los Ojos | Captura la pantalla y valida la UI visualmente |
| 🖐️ **Supabase** | Las Manos | Ejecuta SQL y migraciones en tu base de datos |

Arranca todo:

```bash
npm install
cp .env.local.example .env.local      # añade tus credenciales de Supabase
npm run dev
```

Busca en la salida la línea que confirma que el MCP está activo:
```
- MCP Server: http://localhost:3000/_next/mcp ✓
```

> 🔎 **Checkpoint:** ¿ves esa línea? Entonces la IA podrá *ver* los errores. **Sin MCP, la IA adivina; con MCP, ve exactamente qué está roto y por qué.**

## 2.2 — Dale al bucle agéntico

En otra terminal, abre Claude Code y dale la orden de construir:

```bash
claude .
```
```
Implementa las features según BUSINESS_LOGIC.md
```

Lo que pasa por dentro (el **bucle agéntico Blueprint**) — y por qué funciona:

1. **Delimitar:** divide el trabajo en **FASES** (no en mil subtareas de golpe). Ej: 1) Base de datos, 2) Autenticación, 3) Agenda, 4) Reservas.
2. **Mapear:** *antes* de cada fase, explora el contexto real (qué tablas existen, qué código ya hay). No planifica sobre suposiciones.
3. **Ejecutar:** construye usando los MCPs cuando hace falta — escribe código, mira si hay errores con el MCP de Next.js, valida la pantalla con Playwright, crea tablas con Supabase.
4. **Auto-Blindaje:** si aparece un error, lo arregla, lo prueba **y lo documenta**. ¿La gracia? El mismo error **nunca vuelve a ocurrir**.
5. **Transicionar:** pasa a la siguiente fase con el contexto ya actualizado.

> 💡 **Tu papel aquí:** eres el "Control Room". La IA construye; tú validas en el navegador (`localhost:3000`) que la peluquería puede de verdad reservar una cita. Si algo no te gusta, se lo dices y ajusta.

## 2.3 — Prueba que el MCP funciona (truco de confianza)

Si dudas de que la IA esté *viendo* el código, rompe algo a propósito:
```typescript
// src/app/page.tsx
const roto = undefined.foo  // 💥
```
Con el MCP activo, la IA detecta al instante:
```
TypeError: Cannot read property 'foo' of undefined  at Home (page.tsx:2)
```
Deshaz el cambio y sigue. Ahora confías en que ve lo que pasa.

---

# FASE 3 — Subir a GitHub

Cuando tu app ya hace lo que prometiste (reservar citas sin solapamientos), la subes.

1. Crea un repositorio vacío en [github.com](https://github.com) (botón **New repository**). No marques "add README".
2. En la terminal, dentro de tu proyecto:
   ```bash
   git init
   git add .
   git commit -m "Primera versión: agenda de citas para peluquería"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/peluqueria-citas.git
   git push -u origin main
   ```

> ⚠️ **Antes de subir:** asegúrate de que `.env.local` está en `.gitignore` (la fábrica ya lo trae así). **Nunca subas tus claves de Supabase a GitHub.**

> 💡 También puedes pedírselo a Claude: *"Sube este proyecto a un repo nuevo de GitHub llamado peluqueria-citas."* y lo hace por ti.

---

# FASE 4 — Desplegar en Vercel (producción)

1. Entra en [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. **Add New → Project** → importa el repositorio `peluqueria-citas`.
3. Vercel detecta que es Next.js automáticamente. No toques la configuración de build.
4. Abre **Environment Variables** y añade las mismas que tienes en `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Pulsa **Deploy**. En 1–2 minutos tienes una URL pública (`https://peluqueria-citas.vercel.app`).

**Último ajuste (importante):** vuelve a Supabase → **Authentication → URL Configuration** y añade tu URL de Vercel a las "Redirect URLs". Si no, el login fallará en producción.

> 🔎 **Checkpoint final:** abre la URL de Vercel en el móvil. Si puedes reservar una cita de prueba, **estás en producción.** 🎉

---

# 🔁 El ciclo completo, de un vistazo

```
1. Idea         →  mkdir + saas-factory          (copias la fábrica)
2. Definir      →  /new-app                       (genera BUSINESS_LOGIC.md)
3. Construir    →  "Implementa según BUSINESS_LOGIC.md"  (bucle agéntico + MCPs)
4. Validar      →  localhost:3000                 (tú pruebas que funciona)
5. Subir        →  git push                       (a GitHub)
6. Desplegar    →  Vercel import + deploy          (URL pública)
7. 🚀
```

---

# 🆘 Si te atascas

Como en Business OS, **tu soporte es la propia IA**. Dentro de Claude Code:

- *"El deploy en Vercel falló con este log: [pega]. ¿Qué falta?"*
- *"Quiero añadir recordatorios por email a las citas."*
- *"La pantalla de reservas no se ve bien en móvil, arréglala."*

Y recuerda el **Auto-Blindaje**: cada error que resuelves queda documentado en el proyecto. Tu fábrica se vuelve más fuerte con cada fallo.

---

# ✅ Checklist End-to-End

- [ ] Fábrica instalada (alias `saas-factory` o equivalente Windows).
- [ ] Proyecto creado y `saas-factory` ejecutado dentro.
- [ ] `/new-app` completado → `BUSINESS_LOGIC.md` generado y aprobado.
- [ ] `npm run dev` con la línea `MCP Server ... ✓` visible.
- [ ] Features construidas con el bucle agéntico y validadas en el navegador.
- [ ] Repo subido a GitHub (sin claves).
- [ ] Desplegado en Vercel con las variables de entorno.
- [ ] URLs de redirección añadidas en Supabase.
- [ ] Probado en producción desde el móvil.

**Si marcaste todo: fuiste de la idea a producción tú solo. Eso es replicable.**

---

*Guía Paso a Paso de SaaS-Factory · "De la idea a producción en minutos, no en meses."*

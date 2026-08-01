# Deploy de Guías HTML (Vercel)

Documentación del proceso para publicar/actualizar las páginas HTML de guías en Vercel.

## Páginas y proyectos

| Página (fuente)                  | Carpeta de deploy                | Proyecto Vercel     | Dominio producción              |
| -------------------------------- | -------------------------------- | ------------------- | ------------------------------- |
| `docs/GUIA-BUSINESS-OS.html`     | `.deploy/guia-business-os/`      | `guia-business-os`  | https://guia-business-os.vercel.app |
| `docs/GUIA-SAAS-FACTORY.html`    | `.deploy/guia-saas-factory/`     | `guia-saas-factory` | https://guia-saas-factory.vercel.app |

- **Org / Team Vercel:** `make-flow-ia` (`team_4LzbS9t1Zb022rd3SviMxK4k`)
- **CLI usada:** Vercel CLI 54.4.1
- Cada carpeta de deploy ya está enlazada a su proyecto vía `.vercel/project.json`.
- `.deploy/<proyecto>/.gitignore` ignora la carpeta `.vercel` (no se commitea).

## Cómo redeployar (paso a paso)

El HTML real vive en `docs/`. La carpeta `.deploy/<proyecto>/index.html` es solo una **copia** que Vercel publica. Por eso, antes de cada deploy hay que **sincronizar**.

### Business OS

```bash
# 1. Sincronizar la última versión del HTML a la carpeta de deploy
cp docs/GUIA-BUSINESS-OS.html .deploy/guia-business-os/index.html

# 2. Deploy a producción
cd .deploy/guia-business-os
vercel deploy --prod --yes
```

### SaaS Factory

```bash
cp docs/GUIA-SAAS-FACTORY.html .deploy/guia-saas-factory/index.html
cd .deploy/guia-saas-factory
vercel deploy --prod --yes
```

## Verificación

Tras el deploy, la salida JSON debe mostrar `"readyState": "READY"` y `"target": "production"`.
El dominio estable (`guia-business-os.vercel.app` / `guia-saas-factory.vercel.app`) apunta automáticamente al último deploy de producción.

## Notas

- Si editas la guía, **siempre** edita el archivo fuente en `docs/`, no la copia en `.deploy/`.
- Si la copia y la fuente difieren, vuelve a ejecutar el paso de sincronización.
- Historial de deploys e inspección: panel de Vercel → equipo `make-flow-ia` → proyecto correspondiente.

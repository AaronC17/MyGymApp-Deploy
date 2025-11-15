# Estructura del Proyecto X2

Este informe describe de forma profesional cómo está organizado actualmente el monorepo `MyGymApp-Deploy`, cómo se orquestan los componentes (backend, frontend, AI Hub y almacenamiento) y qué pasos se siguen para ejecutarlo localmente o desplegarlo en Azure App Service.

## 1. Panorama del repositorio

```
mygymapp/
├── backend/                  # API Express 4 + Mongoose + servicios AI
├── frontend/                 # Next.js 14 App Router
├── docs/                     # Referencias (API, deployment, quick start)
├── uploads/                  # Activos locales (productos, usuarios, chat)
├── scripts/                  # Utilidades node para validaciones y seeds
├── azure-deploy.*            # Scripts (PS/Bash) para App Service
├── start-local.ps1           # Lanza backend (3000) + frontend (3001)
└── *.md                      # Documentación de alto nivel
```

### Recursos Azure involucrados
- **App Service Linux (Node 22)**: `gym-app-plan`, recibe los despliegues del backend vía GitHub Actions.
- **Cosmos DB Mongo API**: `energym-cosmos-eastus2`, base `energymdb` con colecciones `users`, `memberships`, `payments`, `products`, `AIConversation`.
- **Azure Blob Storage**: contenedores homólogos a `/uploads` para imágenes y adjuntos.
- **Azure Communication Services** (correo) y claves OpenAI gestionadas mediante `src/config/azure.js` y `src/config/openai.js`.

## 2. Backend (`backend/`)

| Carpeta/archivo | Descripción |
|-----------------|-------------|
| `package.json`  | Scripts (`start`, `dev`, `check-env`, `check-openai`) y dependencias (Express, Mongoose, OpenAI, Azure SDKs). |
| `src/server.js` | Arranca Express, aplica middlewares globales (CORS, JSON, `authenticate`), expone routers en `/api/*` y sirve `/uploads`. |
| `src/config/`   | Configuración modular: `database.js` (Cosmos→Mongo), `azure.js` (blob/email), `openai.js` (cliente GPT). |
| `src/middleware/` | `auth.js` valida JWT y carga el usuario desde Mongo; `requirePremium.js` corta peticiones sin plan premium. |
| `src/models/`   | Definiciones Mongoose para usuarios, membresías, pagos, productos y conversaciones AI. |
| `src/routes/`   | Routers tematizados: `auth`, `clients`, `memberships`, `payments`, `products`, `ai`, `admin`, `subscribe`, `userProfile`. |
| `src/services/membershipService.js` | Reglas de negocio (renovaciones, recordatorios, cálculos de expiración). |
| `scripts/`      | `checkEnv.js`/`checkOpenAI.js` validan `.env`; `createAdmin(s).js` crea administradores conectándose a Cosmos. |
| `uploads/`      | Subcarpetas `products/`, `chat/`, `users/` usadas localmente antes de sincronizar con Blob Storage. |

### Flujo interno del backend
1. **Configuración**: `dotenv` lee variables (JWT, Cosmos, OpenAI). `database.js` prueba `COSMOS_DB_CONNECTION_STRING`, si falla cae a `MONGODB_URI` o Mongo local.
2. **Middlewares**: Todas las rutas protegidas pasan por `authenticate`. Las rutas premium (AI Hub) también pasan por `requirePremium`.
3. **Rutas**: Cada archivo en `src/routes` exporta un router Express; `server.js` lo monta bajo `/api/<dominio>` siguiendo la organización del dominio (p. ej. `/api/memberships`).
4. **Persistencia**: Los modelos Mongoose guardan/leen en Cosmos vía el driver Mongo.
5. **Assets**: `server.js` expone `/uploads` para servir archivos subidos y mantiene paridad con Azure Blob.

### Despliegue automatizado del backend
El workflow `.github/workflows/main_gym-app-plan.yml` realiza:
1. **Checkout + Node 22** (con cache de npm apuntando a `backend/package-lock.json`).
2. **`npm ci` + build opcional + prune** dentro de `backend/` para dejar sólo dependencias productivas.
3. **Empaquetado**: copia `backend/` a `output/` y sube el artefacto `backend-app`.
4. **Deploy**: descarga el artefacto, ejecuta `azure/login@v2` con los secretos federados `AZUREAPPSERVICE_*` y publica en `gym-app-plan` usando `azure/webapps-deploy@v3` (slot Production).
5. **App Settings esperados**: `JWT_SECRET`, `OPENAI_API_KEY`, `COSMOS_DB_CONNECTION_STRING`, `MONGODB_URI`, además de cualquier clave Azure opcional. Sin ellos el chequeo `scripts/checkEnv.js` fallará.

## 3. Frontend (`frontend/`)

| Elemento | Detalle |
|----------|---------|
| `src/app/` | Usa App Router con segmentación: `(client)` para el área del socio (dashboard, perfil, recibos, AI Hub); `(admin)` para panel operativo (clientes, inventario, pagos, planes, dashboard); rutas públicas (`/`, `/planes`, `/tienda`, `/contacto`, `/suscripcion`) y de auth (`/login`, `/register`). |
| `src/components/` | `ProtectedRoute.tsx` se apoya en Zustand para redirigir si no hay token; `Toast.tsx` centraliza notificaciones. |
| `src/lib/api.ts` | Axios preconfigurado con `NEXT_PUBLIC_API_URL` y manejo de tokens/borrado de `Content-Type` en `FormData`. |
| `src/store/authStore.ts` | Zustand + persistencia en `localStorage` para mantener token y datos del usuario en todas las páginas. |
| Configuración global | `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json` adaptados a Next 14 + Tailwind. |

Actualmente no existe pipeline automático para la carpeta `frontend/`. El despliegue se realiza manualmente o desde desarrollo local apuntando al backend (`NEXT_PUBLIC_API_URL=http://localhost:3000/api` o el endpoint del App Service). El siguiente paso natural es crear un workflow similar al backend que ejecute `npm ci`, `npm run build`, y suba el resultado a otro App Service, Azure Static Web Apps o Storage + CDN.

## 4. Documentación, scripts y utilidades clave
- `ARCHITECTURE.md` y `PROJECT_SUMMARY.md`: visión arquitectónica, dominios y dependencias.
- `README.md`, `QUICK_START.md`, `INICIO-RAPIDO.md`: pasos de instalación en español, variables necesarias y guía de troubleshooting.
- `docs/DEPLOYMENT.md`: instrucciones `az` para crear Cosmos DB, App Service, configurar app settings y publicar.
- `start-local.ps1`: orquestador que levanta backend + frontend y recuerda iniciar Mongo/Cosmos.
- `azure-deploy.ps1`/`.sh`: scripts que simplifican un despliegue manual sin GitHub Actions.

## 5. Datos, almacenamiento y sincronización
- **Cosmos DB**: conexión `mongodb://energym-cosmos-eastus2...` almacenada en `COSMOS_DB_CONNECTION_STRING`. `MONGODB_URI` apunta a la base y colección concretas (`energymdb`). El backend usa ambas para garantizar compatibilidad local/remota.
- **Azure Blob Storage**: Los helpers en `src/config/azure.js` exponen `getContainerClient` y sólo intentan conectarse si existen credenciales; así se evita romper entornos locales sin Azure.
- **Uploads locales**: `uploads/products`, `uploads/users`, `uploads/chat` se mantienen sincronizados con los contenedores equivalentes cuando se ejecuta en Azure.

## 6. Flujo operativo paso a paso
1. **Preparar variables**: copiar `backend/ENV_EJEMPLO.txt` a `backend/.env` y rellenar llaves; en frontend crear `.env.local` con `NEXT_PUBLIC_API_URL`.
2. **Validar**: `cd backend && npm run check-env && npm run check-openai` para asegurar que Cosmos, JWT y OpenAI están configurados.
3. **Desarrollo local**:
   ```powershell
   # Windows (lanza ambos servicios)
   ./start-local.ps1
   ```
   Backend queda en `http://localhost:3000/api`, frontend en `http://localhost:3001`.
4. **Commit + push**: se trabaja sobre `main`; al hacer push, GitHub Actions ejecuta el workflow `main_gym-app-plan` y despliega el backend.
5. **Azure App Service**: se asegura que `gym-app-plan` tenga los App Settings mencionados y Node 22. Tras cada despliegue el sitio `https://gym-app-plan.azurewebsites.net` queda actualizado con la API.

## 7. Próximos pasos recomendados
1. **Automatizar frontend**: crear un segundo workflow que construya Next.js y lo publique (SWA, otro App Service o Static Web Apps). Incluir `NEXT_PUBLIC_API_URL` apuntando al backend publicado.
2. **Centralizar secretos**: mover cadenas largas (Cosmos, OpenAI) a Azure Key Vault o GitHub OIDC + federated credentials para reducir exposición en workflows.
3. **Sincronizar uploads**: documentar un proceso (script o servicio) que copie `/uploads` a Blob Storage durante el deploy.
4. **Monitoreo**: habilitar Application Insights en el App Service y agregar un paso post-deploy en el workflow para verificar salud (`/api/health`).

Con esta estructura, cualquier miembro del equipo puede localizar rápidamente cada responsabilidad (API, UI, scripts, documentación) y seguir el mismo camino tanto para desarrollo local como para despliegues en Azure.

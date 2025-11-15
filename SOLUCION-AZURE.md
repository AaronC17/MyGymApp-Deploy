# 🔧 Configuración Crítica de Azure App Service

## Problema Identificado
El backend está fallando porque **Mongoose 8 no es compatible con Cosmos DB**. Ya actualizamos a Mongoose 7.6.3 localmente, pero necesitas hacer push de los cambios y configurar las variables de entorno correctamente en Azure.

## ✅ Pasos para Solucionar

### 1. **Hacer Push de los Cambios de Mongoose 7**

```bash
cd backend
git add package.json package-lock.json
git commit -m "fix: downgrade mongoose to 7.6.3 for Cosmos DB compatibility"
git push origin main
```

### 2. **Configurar Variables de Entorno en Azure Portal**

#### **Backend (gym-app-plan)**
Ve a Azure Portal → App Services → gym-app-plan → Configuration → Application settings

Agrega/verifica estas variables (usa los valores reales de tu Azure Portal):

```
JWT_SECRET=<tu-jwt-secret-actual>
COSMOS_DB_CONNECTION_STRING=<tu-cosmos-db-connection-string>
FRONTEND_URL=https://gym-frontend-app-ccgugbg0c4atfmc3.eastus-01.azurewebsites.net
CORS_ORIGIN=https://gym-frontend-app-ccgugbg0c4atfmc3.eastus-01.azurewebsites.net
OPENAI_API_KEY=<tu-openai-api-key>
NODE_ENV=production
PORT=8080
```

**Para obtener tus valores reales:**
```bash
az webapp config appsettings list --name gym-app-plan --resource-group gym-app-rg
```

#### **Frontend (gym-frontend-app)**
Ve a Azure Portal → App Services → gym-frontend-app → Configuration → Application settings

Agrega/verifica estas variables:

```
NEXT_PUBLIC_API_URL=https://gym-app-plan-cwc5hqcgf8gudxb8.eastus-01.azurewebsites.net/api
NODE_ENV=production
```

### 3. **Configurar Startup Commands en Azure Portal**

#### **Backend:**
Configuration → General settings → Startup Command:
```
node src/server.js
```

#### **Frontend:**
Configuration → General settings → Startup Command:
```
node server.js
```

### 4. **Verificar Node Version**

Ambas apps deben usar Node 22. En Configuration → General settings:
- Stack: Node
- Major version: 22
- Minor version: 22 LTS

### 5. **Hacer Push y Esperar al Deploy**

```bash
git add .
git commit -m "fix: add web.config and update workflows"
git push origin main
```

Las GitHub Actions se ejecutarán automáticamente.

### 6. **Verificar Deployment**

Una vez que las Actions terminen:

**Backend:**
```bash
curl https://gym-app-plan-cwc5hqcgf8gudxb8.eastus-01.azurewebsites.net/api/products
```

**Frontend:**
```
https://gym-frontend-app-ccgugbg0c4atfmc3.eastus-01.azurewebsites.net
```

## 🔍 Si Sigue Sin Funcionar

### Ver logs en tiempo real:

**Backend:**
```bash
az webapp log tail --name gym-app-plan --resource-group gym-app-rg
```

**Frontend:**
```bash
az webapp log tail --name gym-frontend-app --resource-group gym-app-rg
```

### Reiniciar apps:
```bash
az webapp restart --name gym-app-plan --resource-group gym-app-rg
az webapp restart --name gym-frontend-app --resource-group gym-app-rg
```

## 📋 Resumen del Problema Original

1. ❌ **Mongoose 8 incompatible con Cosmos DB** (wire version 6 vs 8 requerido)
2. ❌ **Variables de entorno faltantes** en Azure App Service
3. ❌ **web.config faltante** en el deploy del frontend
4. ❌ **Startup commands incorrectos** o no configurados

## ✅ Soluciones Aplicadas

1. ✅ Downgrade a Mongoose 7.6.3
2. ✅ Agregado web.config al backend y frontend
3. ✅ Actualizado workflows de GitHub Actions
4. ✅ Creados scripts de deployment locales como backup
5. 📝 Instrucciones para configurar variables en Azure Portal

---

**URLs de tus apps:**
- Backend: https://gym-app-plan-cwc5hqcgf8gudxb8.eastus-01.azurewebsites.net
- Frontend: https://gym-frontend-app-ccgugbg0c4atfmc3.eastus-01.azurewebsites.net

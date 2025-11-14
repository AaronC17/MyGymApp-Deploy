# 🚀 Inicio Rápido - Energym Local

## ✅ Servidores Iniciados

He iniciado ambos servidores para ti:

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:3001

## 📋 Pasos para Ver la Aplicación

### 1. Abre tu navegador
Ve a: **http://localhost:3001**

### 2. Configuración de Base de Datos (Opcional)

Si ves errores de conexión a MongoDB, tienes 3 opciones:

#### Opción A: MongoDB Local (Recomendado para desarrollo)
1. Descarga e instala MongoDB Community: https://www.mongodb.com/try/download/community
2. Inicia MongoDB en tu sistema
3. El backend se conectará automáticamente a `mongodb://localhost:27017/energym-db`

#### Opción B: MongoDB Atlas (Gratis - En la nube)
1. Crea una cuenta gratis en: https://www.mongodb.com/cloud/atlas
2. Crea un cluster gratuito
3. Obtén la connection string
4. Actualiza `backend/.env` con tu connection string:
   ```
   COSMOS_DB_CONNECTION_STRING=tu-connection-string-de-atlas
   ```
5. Reinicia el backend

#### Opción C: Continuar sin Base de Datos
- El servidor iniciará pero algunas funciones no funcionarán
- Útil solo para ver el frontend

### 3. Crear Usuario Administrador

Una vez que MongoDB esté funcionando, crea un admin:

```bash
cd backend
node scripts/createAdmin.js
```

Credenciales por defecto:
- Email: `admin@energym.com`
- Password: `admin123`

## 🎯 Acceder a la Aplicación

1. **Página Principal**: http://localhost:3001
2. **Login**: http://localhost:3001/login
   - Como cliente: registra una cuenta nueva
   - Como admin: usa `admin@energym.com` / `admin123`

3. **Dashboard Cliente**: http://localhost:3001/dashboard
4. **Dashboard Admin**: http://localhost:3001/admin/dashboard

## 🛠️ Comandos Útiles

### Iniciar servidores manualmente:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### O usar el script automático:
```powershell
.\start-local.ps1
```

## ⚠️ Solución de Problemas

### Error: "Cannot connect to MongoDB"
- Verifica que MongoDB esté corriendo
- Revisa la connection string en `backend/.env`
- Para desarrollo local, usa: `mongodb://localhost:27017/energym-db`

### Error: "Port already in use"
- Cambia el puerto en `backend/.env` (PORT=3001)
- O detén el proceso que está usando el puerto

### Los servidores no inician
- Verifica que las dependencias estén instaladas:
  ```bash
  cd backend && npm install
  cd ../frontend && npm install
  ```

## 📝 Notas

- El backend corre en el puerto **3000**
- El frontend corre en el puerto **3001**
- Los cambios en el código se reflejan automáticamente (hot-reload)
- Para detener los servidores, presiona `Ctrl+C` en cada ventana

---

¡Disfruta desarrollando con Energym! 🏋️


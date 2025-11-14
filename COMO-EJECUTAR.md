# 🚀 Cómo Ejecutar Energym Localmente

## 📋 Opción 1: Script Automático (Más Fácil)

### Windows (PowerShell):
```powershell
.\start-local.ps1
```

Esto iniciará automáticamente ambos servidores en ventanas separadas.

---

## 📋 Opción 2: Manual (Paso a Paso)

### Paso 1: Iniciar el Backend

Abre una **terminal/PowerShell** y ejecuta:

```bash
cd backend
npm run dev
```

Deberías ver:
```
🚀 Server running on port 3000
✅ MongoDB Connected: ...
```

**El backend estará en:** http://localhost:3000

---

### Paso 2: Iniciar el Frontend

Abre **otra terminal/PowerShell** (nueva ventana) y ejecuta:

```bash
cd frontend
npm run dev
```

Deberías ver:
```
▲ Next.js 14.2.33
- Local:        http://localhost:3001
```

**El frontend estará en:** http://localhost:3001

---

## 🌐 Acceder a la Aplicación

Una vez que ambos servidores estén corriendo:

1. **Abre tu navegador**
2. **Ve a:** http://localhost:3001
3. **Verás la página principal de Energym**

---

## 📝 Comandos Rápidos

### Backend:
```bash
cd backend
npm run dev        # Modo desarrollo (con auto-reload)
npm start          # Modo producción
```

### Frontend:
```bash
cd frontend
npm run dev        # Modo desarrollo (con auto-reload)
npm run build      # Compilar para producción
npm start          # Modo producción
```

---

## ⚠️ Solución de Problemas

### Error: "Port already in use"
Si el puerto 3000 o 3001 está ocupado:

**Backend:**
- Edita `backend/.env` y cambia: `PORT=3000` a `PORT=3001` (o otro puerto)
- Actualiza `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3001/api`

**Frontend:**
- Next.js te preguntará si quieres usar otro puerto automáticamente

### Error: "Cannot find module"
```bash
# Reinstalar dependencias
cd backend
npm install

cd ../frontend
npm install
```

### Error: "MongoDB connection failed"
- El servidor iniciará pero algunas funciones no funcionarán
- Para desarrollo completo, configura MongoDB (ver `INICIO-RAPIDO.md`)

---

## 🛑 Detener los Servidores

En cada terminal donde está corriendo un servidor:
- Presiona `Ctrl + C`
- O cierra la ventana de terminal

---

## 📊 Resumen de Puertos

| Servicio | Puerto | URL |
|----------|--------|-----|
| Backend API | 3000 | http://localhost:3000 |
| Frontend | 3001 | http://localhost:3001 |
| API Endpoints | 3000 | http://localhost:3000/api |

---

## ✅ Verificación Rápida

1. ✅ Backend corriendo → http://localhost:3000/health (debería responder `{"status":"ok"}`)
2. ✅ Frontend corriendo → http://localhost:3001 (deberías ver la página principal)
3. ✅ Todo listo → Puedes navegar y usar la aplicación

---

¡Listo para desarrollar! 🎉


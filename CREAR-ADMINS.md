# 👥 Crear Administradores Predefinidos

## 🚀 Crear los 4 Administradores

Para crear los 4 administradores predefinidos, ejecuta:

```bash
cd backend
node scripts/createAdmins.js
```

## 📧 Credenciales de los Administradores

Una vez ejecutado el script, tendrás estos 4 administradores:

| Admin | Email | Password |
|-------|-------|----------|
| Admin 1 | `admin1@energym.com` | `12341234` |
| Admin 2 | `admin2@energym.com` | `12341234` |
| Admin 3 | `admin3@energym.com` | `12341234` |
| Admin 4 | `admin4@energym.com` | `12341234` |

## 🔐 Redireccionamiento Automático

Cuando un administrador inicia sesión:

1. **Login**: http://localhost:3001/login
2. **Ingresa credenciales** de cualquier admin
3. **Redirección automática** a: http://localhost:3001/admin/dashboard

El sistema detecta automáticamente si el usuario es admin y lo redirige al panel administrativo.

## ✅ Verificar que Funciona

1. Ejecuta el script para crear los admins
2. Inicia sesión con cualquier admin
3. Deberías ser redirigido automáticamente a `/admin/dashboard`
4. Verás el panel administrativo con métricas y opciones

## 🔄 Si los Admins Ya Existen

El script es inteligente:
- Si un admin ya existe, lo **actualiza** con la nueva contraseña
- Si no existe, lo **crea** nuevo
- Puedes ejecutarlo múltiples veces sin problemas

---

¡Listo para usar! 🎉


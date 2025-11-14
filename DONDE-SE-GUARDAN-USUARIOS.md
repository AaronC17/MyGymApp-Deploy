# 📍 Dónde se Guardan los Usuarios

## 🗄️ Base de Datos

Los usuarios se guardan en **MongoDB** (o Azure Cosmos DB con API de MongoDB).

### Configuración Actual:

- **Base de datos:** `energym-db`
- **Colección:** `users` (Mongoose pluraliza automáticamente el modelo "User")
- **Connection String:** Configurada en `backend/.env`

---

## 📂 Ubicación de la Configuración

### Archivo de Configuración:
```
backend/.env
```

Contiene:
```env
COSMOS_DB_CONNECTION_STRING=mongodb://localhost:27017/energym-db
```

### Modelo de Usuario:
```
backend/src/models/User.js
```

---

## 🔍 Cómo Ver los Usuarios

### Opción 1: MongoDB Compass (Recomendado - Interfaz Gráfica)

1. **Descarga MongoDB Compass:**
   - https://www.mongodb.com/try/download/compass

2. **Conecta a tu base de datos:**
   - Connection String: `mongodb://localhost:27017`
   - O la connection string de tu `.env`

3. **Navega a:**
   - Base de datos: `energym-db`
   - Colección: `users`

### Opción 2: MongoDB Shell (mongo/mongosh)

```bash
# Conectar a MongoDB
mongosh mongodb://localhost:27017/energym-db

# Ver todos los usuarios
db.users.find().pretty()

# Ver un usuario específico
db.users.findOne({ email: "admin@energym.com" })

# Contar usuarios
db.users.countDocuments()
```

### Opción 3: Desde la API (Admin)

Si estás logueado como admin:
```
GET http://localhost:3000/api/clients
```

---

## 👤 Estructura de un Usuario

Cada usuario tiene esta estructura:

```javascript
{
  _id: ObjectId("..."),
  email: "usuario@example.com",
  password: "$2a$10$...",  // Hash bcrypt (nunca se muestra)
  role: "client" | "admin",
  name: "Nombre del Usuario",
  phone: "+1234567890",
  avatar: "url-de-imagen",
  weight: 75,
  goal: "Perder peso",
  currentPlan: ObjectId("..."),  // Referencia a Membership
  createdAt: ISODate("2024-01-15T10:00:00Z"),
  updatedAt: ISODate("2024-01-15T10:00:00Z")
}
```

---

## ➕ Cómo Crear Usuarios

### Opción 1: Script Automático (Admin)

```bash
cd backend
node scripts/createAdmin.js
```

Crea un usuario administrador:
- Email: `admin@energym.com`
- Password: `admin123`

### Opción 2: Registro desde el Frontend

1. Ve a: http://localhost:3001/register
2. Completa el formulario
3. Se crea automáticamente como `role: "client"`

### Opción 3: API (Admin)

```bash
POST http://localhost:3000/api/clients
Headers: Authorization: Bearer <admin-token>
Body: {
  "email": "nuevo@example.com",
  "password": "password123",
  "name": "Nuevo Usuario",
  "phone": "+1234567890"
}
```

### Opción 4: MongoDB Shell (Directo)

```javascript
// Conectar
mongosh mongodb://localhost:27017/energym-db

// Crear usuario (password será texto plano - NO recomendado)
db.users.insertOne({
  email: "test@example.com",
  password: "password123",  // Se hasheará en el próximo login
  role: "client",
  name: "Usuario Test",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

⚠️ **Nota:** Si creas usuarios directamente en MongoDB, el password NO estará hasheado. Es mejor usar la API o el script.

---

## 🔐 Seguridad

- **Passwords:** Se guardan hasheados con bcrypt (nunca en texto plano)
- **Email:** Debe ser único
- **Role:** Solo puede ser "client" o "admin"

---

## 📊 Verificar Conexión a la Base de Datos

### En el Backend:

Cuando inicias el backend, deberías ver:

```
✅ MongoDB Connected: localhost:27017
```

Si ves un error, significa que:
- MongoDB no está corriendo
- La connection string es incorrecta
- No tienes permisos de acceso

---

## 🌐 Para Producción (Azure)

En producción, los usuarios se guardan en:
- **Azure Cosmos DB** con API de MongoDB
- Connection string configurada en Azure App Service
- Misma estructura, solo cambia la ubicación

---

## 🛠️ Comandos Útiles

### Ver usuarios desde terminal (con mongosh):

```bash
# Conectar
mongosh mongodb://localhost:27017/energym-db

# Ver todos
db.users.find().pretty()

# Buscar por email
db.users.find({ email: "admin@energym.com" })

# Eliminar usuario (¡cuidado!)
db.users.deleteOne({ email: "test@example.com" })

# Actualizar usuario
db.users.updateOne(
  { email: "admin@energym.com" },
  { $set: { name: "Nuevo Nombre" } }
)
```

---

## 📝 Resumen

| Aspecto | Detalle |
|---------|---------|
| **Base de datos** | MongoDB / Cosmos DB |
| **Nombre DB** | `energym-db` |
| **Colección** | `users` |
| **Connection String** | `backend/.env` → `COSMOS_DB_CONNECTION_STRING` |
| **Modelo** | `backend/src/models/User.js` |
| **Passwords** | Hasheados con bcrypt |
| **Ver usuarios** | MongoDB Compass, mongosh, o API admin |

---

¿Necesitas ayuda para ver o crear usuarios? 🚀


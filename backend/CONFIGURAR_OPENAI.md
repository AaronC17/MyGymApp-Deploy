# 🔧 Configuración de OpenAI API Key

## ⚠️ IMPORTANTE: Configuración Requerida

Para que el AI Hub funcione correctamente, necesitas configurar tu API key de OpenAI.

## 📝 Pasos para Configurar

### 1. Obtener tu API Key de OpenAI

1. Ve a [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Inicia sesión o crea una cuenta
3. Haz clic en "Create new secret key"
4. Copia la API key (comienza con `sk-`)

### 2. Configurar en el Backend

Crea o edita el archivo `backend/.env` y agrega:

```env
OPENAI_API_KEY=sk-xxxxxx-tu-api-key-aqui
```

**⚠️ IMPORTANTE:**
- Reemplaza la API key de ejemplo con tu propia API key
- Nunca compartas tu API key públicamente
- No commitees el archivo `.env` al repositorio

### 3. Reiniciar el Servidor

Después de agregar la API key, reinicia el servidor backend:

```bash
cd backend
npm run dev
```

### 4. Verificar la Configuración

Cuando inicies el servidor, deberías ver uno de estos mensajes:

✅ **Correcto:**
```
✅ OpenAI API Key configurada correctamente
```

❌ **Error:**
```
❌ ERROR: OPENAI_API_KEY no está configurada en las variables de entorno
```

## 🔍 Verificación de la API Key

La API key debe:
- Comenzar con `sk-`
- Tener al menos 50 caracteres
- Estar activa en tu cuenta de OpenAI

## 🐛 Solución de Problemas

### Error: "OpenAI no está configurado"

1. Verifica que el archivo `backend/.env` existe
2. Verifica que `OPENAI_API_KEY` está escrito correctamente (sin espacios)
3. Verifica que la API key comienza con `sk-`
4. Reinicia el servidor después de hacer cambios

### Error: "Error de autenticación con OpenAI"

1. Verifica que la API key es válida
2. Verifica que la API key no ha expirado
3. Verifica que tienes créditos en tu cuenta de OpenAI
4. Genera una nueva API key si es necesario

### Error: "Límite de tasa excedido"

- Has excedido el límite de solicitudes
- Espera unos minutos antes de intentar de nuevo
- Considera actualizar tu plan de OpenAI

## 📍 Ubicación del Archivo

El archivo `.env` debe estar en:
```
backend/.env
```

## 🔒 Seguridad

- **NUNCA** compartas tu API key
- **NUNCA** commitees el archivo `.env` a Git
- El archivo `.env` ya está en `.gitignore` para protegerlo

## 💰 Costos

OpenAI cobra por uso. Los costos aproximados son:
- Chat: ~$0.01 por 1000 tokens
- Planes alimenticios: ~$0.02 por plan
- Rutinas: ~$0.02 por rutina

Monitorea tu uso en [https://platform.openai.com/usage](https://platform.openai.com/usage)


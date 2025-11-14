# 🤖 AI Hub - Configuración e Integración con OpenAI

## 📋 Descripción

El AI Hub es una funcionalidad exclusiva para usuarios Premium que integra OpenAI GPT-4 para proporcionar:

- **Chat con Asistente Personal de Fitness**: Respuestas personalizadas sobre nutrición, rutinas, suplementación y motivación
- **Planes Alimenticios Personalizados**: Generación automática de planes semanales según objetivos y preferencias
- **Rutinas Inteligentes**: Creación de rutinas de ejercicio adaptadas al nivel y objetivos del usuario

## 🔧 Configuración del Backend

### 1. Instalar Dependencias

```bash
cd backend
npm install openai
```

### 2. Configurar Variable de Entorno

Agrega tu API key de OpenAI al archivo `backend/.env`:

```env
OPENAI_API_KEY=sk-xxxxxx-tu-api-key-aqui
```

**⚠️ IMPORTANTE**: 
- Nunca commitees el archivo `.env` al repositorio
- Mantén tu API key segura y no la compartas públicamente
- Considera usar variables de entorno en producción (Azure App Service)

### 3. Estructura de Archivos Creados

```
backend/
├── src/
│   ├── config/
│   │   └── openai.js          # Configuración de OpenAI
│   ├── middleware/
│   │   └── requirePremium.js  # Middleware para verificar plan Premium
│   ├── models/
│   │   └── AIConversation.js  # Modelo para historial de conversaciones
│   └── routes/
│       └── ai.js              # Rutas de la API de AI
```

## 🚀 Endpoints de la API

### POST `/api/ai/chat`
Chat con el asistente de IA.

**Request:**
```json
{
  "message": "¿Cuántas proteínas debo consumir al día?"
}
```

**Response:**
```json
{
  "message": "La cantidad de proteínas recomendada...",
  "tokensUsed": 150
}
```

### POST `/api/ai/meal-plan`
Genera un plan alimenticio personalizado.

**Request:**
```json
{
  "preferences": ["vegano", "sin gluten"],
  "dietType": "vegano"
}
```

**Response:**
```json
{
  "mealPlan": "Plan alimenticio semanal...",
  "tokensUsed": 800
}
```

### POST `/api/ai/workout-routine`
Genera una rutina de ejercicios personalizada.

**Request:**
```json
{
  "experience": "intermediate",
  "focus": "fuerza"
}
```

**Response:**
```json
{
  "workoutRoutine": "Rutina semanal de ejercicios...",
  "tokensUsed": 1000
}
```

### GET `/api/ai/history`
Obtiene el historial de conversaciones.

**Query Params:**
- `type` (opcional): `chat`, `meal_plan`, `workout_routine`

### DELETE `/api/ai/history/:id`
Elimina una conversación del historial.

## 🎨 Frontend

### Página Principal: `/ai-hub`

La página del AI Hub incluye:

1. **Tabs de Navegación**:
   - Chat: Conversación libre con el asistente
   - Plan Alimenticio: Generación de planes personalizados
   - Rutina: Generación de rutinas de ejercicio

2. **Verificación de Premium**:
   - Verifica automáticamente si el usuario tiene plan Premium
   - Muestra mensaje si no tiene acceso

3. **Interfaz de Chat**:
   - Mensajes estilo ChatGPT
   - Indicador de carga
   - Historial persistente

## 🔒 Seguridad y Rate Limiting

- **Rate Limiting**: 30 solicitudes por 15 minutos por usuario
- **Verificación Premium**: Middleware que verifica membresía activa Premium
- **Autenticación**: Requiere JWT token válido

## 💰 Costos de OpenAI

El sistema usa GPT-4 Turbo con los siguientes costos aproximados:

- **Chat**: ~$0.01 por 1000 tokens
- **Planes Alimenticios**: ~$0.02 por plan (2000 tokens)
- **Rutinas**: ~$0.02 por rutina (2000 tokens)

**Recomendaciones**:
- Monitorea el uso de tokens en producción
- Considera implementar límites adicionales por usuario
- Usa GPT-4-mini para tareas menos complejas si es necesario

## 📊 Modelo de Datos

### AIConversation

```javascript
{
  userId: ObjectId,
  type: 'chat' | 'meal_plan' | 'workout_routine',
  messages: [
    {
      role: 'user' | 'assistant' | 'system',
      content: String,
      timestamp: Date
    }
  ],
  context: {
    weight: Number,
    height: Number,
    goal: String,
    preferences: [String],
    experience: String
  },
  metadata: {
    model: String,
    tokensUsed: Number,
    cost: Number
  }
}
```

## 🧪 Pruebas

1. **Verificar Premium Access**:
   - Asegúrate de tener un usuario con plan Premium activo
   - Intenta acceder a `/ai-hub` sin Premium (debe mostrar mensaje)

2. **Probar Chat**:
   - Envía mensajes al asistente
   - Verifica que las respuestas sean relevantes y personalizadas

3. **Probar Generación**:
   - Genera un plan alimenticio
   - Genera una rutina de ejercicios
   - Verifica que se guarden en el historial

## 🚀 Despliegue en Azure

1. **Variables de Entorno en Azure App Service**:
   ```
   OPENAI_API_KEY=tu-api-key-aqui
   ```

2. **Verificar Conexión**:
   - El backend debe conectarse a OpenAI sin problemas
   - Verifica los logs en caso de errores

## 📝 Notas Adicionales

- El sistema guarda automáticamente el historial de conversaciones
- Los prompts del sistema incluyen contexto del usuario (peso, objetivo, etc.)
- Se mantiene un historial de los últimos 10 mensajes para contexto
- El costo se calcula y guarda en metadata para análisis futuro

## 🔄 Próximas Mejoras

- [ ] Exportar planes alimenticios a PDF
- [ ] Guardar rutinas favoritas
- [ ] Notificaciones de recordatorios de entrenamiento
- [ ] Integración con tracking de progreso
- [ ] Análisis de costos y uso por usuario


// ============================================================================
// 🤖 AI Routes - Premium Features with OpenAI
// Author: Aarón Contreras
// Description: Handles AI-powered features for Premium users
// ============================================================================

const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const PDFDocument = require('pdfkit');
const { authenticate } = require('../middleware/auth');
const requirePremium = require('../middleware/requirePremium');
const openaiModule = require('../config/openai');
const openai = openaiModule;
const AIConversation = require('../models/AIConversation');
const User = require('../models/User');
const Membership = require('../models/Membership');

const router = express.Router();

// ============================================================================
// 🔹 Helper Functions
// ============================================================================

// Clean and format content for PDF
const cleanContentForPDF = (content) => {
  if (!content) return '';
  
  let cleaned = content;
  
  // Remove markdown headers (###, ##, #) - be more aggressive
  cleaned = cleaned.replace(/^#{1,6}\s*/gm, '');
  
  // Remove markdown horizontal rules (---, ***, ___) - these are separators
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, '');
  cleaned = cleaned.replace(/^[-*_]{3,}/gm, '');
  
  // Remove bold markdown (**text** or __text__) - handle nested cases
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1'); // Second pass for nested
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  
  // Remove italic markdown (*text* or _text_) but be careful with lists
  // Use a simpler approach that doesn't require lookbehind
  cleaned = cleaned.replace(/\*([^*\n]+)\*/g, '$1');
  cleaned = cleaned.replace(/_([^_\n]+)_/g, '$1');
  
  // Remove markdown list markers and convert to clean format
  // Do this before removing remaining asterisks
  cleaned = cleaned.replace(/^[\s]*[-*]\s+/gm, '• ');
  cleaned = cleaned.replace(/^\d+\.\s+/gm, '');
  
  // Remove remaining standalone asterisks that might be formatting artifacts
  // But preserve bullet points (•)
  cleaned = cleaned.replace(/\s+\*\s+/g, ' ');
  cleaned = cleaned.replace(/^\*\s*/gm, '');
  cleaned = cleaned.replace(/\s*\*$/gm, '');
  cleaned = cleaned.replace(/\*\*/g, ''); // Remove any remaining double asterisks
  
  // Remove problematic special characters but keep Spanish characters (á, é, í, ó, ú, ñ, etc.)
  // Remove emojis and weird symbols but keep standard ASCII and extended ASCII for Spanish
  cleaned = cleaned.replace(/[^\x20-\xFF\n\r•]/g, '');
  
  // Remove specific problematic character sequences
  cleaned = cleaned.replace(/Ø=Üª/g, '');
  cleaned = cleaned.replace(/[ØÜª]/g, '');
  cleaned = cleaned.replace(/[^\x20-\x7E\u00A0-\u00FF\n\r•]/g, '');
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  
  // Clean up multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Remove trailing whitespace from each line
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  
  // Remove trailing whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
};

// Format content for PDF with proper structure
const formatContentForPDF = (doc, content, fontSize = 11) => {
  const lines = content.split('\n');
  const pageHeight = 750;
  const margin = 50;
  const lineHeight = fontSize * 1.4;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if we need a new page
    if (doc.y + lineHeight > pageHeight - 50) {
      doc.addPage();
    }
    
    if (!line) {
      doc.moveDown(0.5);
      continue;
    }
    
    // Check if line is a main section title (like "Rutina Semanal de Ejercicio")
    if (line.length > 20 && line.length < 60 && 
        (line.includes('Rutina') || line.includes('Plan') || line.includes('Semanal') || 
         line.includes('Ejercicio') || line.includes('Alimenticio'))) {
      doc.moveDown(1);
      doc
        .fontSize(fontSize + 3)
        .fillColor('#1e40af')
        .text(line, { bold: true });
      doc.fontSize(fontSize).fillColor('#111827');
      doc.moveDown(0.5);
    }
    // Check if line is a day title (like "Lunes" or "Lunes:")
    else if (line.match(/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)/i)) {
      doc.moveDown(1.2);
      doc
        .fontSize(fontSize + 3)
        .fillColor('#3b82f6')
        .text(line.replace(/:/g, ''), { bold: true });
      doc.fontSize(fontSize).fillColor('#111827');
      doc.moveDown(0.8);
    }
    // Check if line is a meal (Desayuno, Almuerzo, Cena, Snack with kcal)
    else if (line.match(/(Desayuno|Almuerzo|Cena|Snack|Merienda).*\(.*kcal\)/i)) {
      doc.moveDown(0.6);
      doc
        .fontSize(fontSize + 1)
        .fillColor('#1e40af')
        .text(line, { bold: true });
      doc.fontSize(fontSize).fillColor('#111827');
      doc.moveDown(0.4);
    }
    // Check if line is a subtitle (like "Calentamiento:", "Series:", etc.)
    else if (line.endsWith(':') && line.length < 40 && !line.includes('•') && 
             !line.match(/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)/i) &&
             !line.match(/(Desayuno|Almuerzo|Cena|Snack|Merienda)/i)) {
      doc.moveDown(0.4);
      doc
        .fontSize(fontSize)
        .fillColor('#1e40af')
        .text(line, { bold: true });
      doc.fontSize(fontSize).fillColor('#111827');
      doc.moveDown(0.3);
    }
    // Check if line is an exercise name (starts with number or is a bold exercise name)
    else if (line.match(/^\d+\.\s+[A-Z]/) || 
             (line.length < 60 && line.length > 5 && 
              (line.match(/^[A-Z][a-z]+.*(Press|Curl|Squat|Deadlift|Pull|Push|Row|Fly|Extension|Swing|Burpee|Thruster|Plank|Crunch)/i) ||
               line.match(/^[A-Z][a-z]+.*(de|con|en|al)/i)))) {
      doc.moveDown(0.4);
      doc
        .fontSize(fontSize)
        .fillColor('#111827')
        .text(line.replace(/^\d+\.\s*/, ''), { bold: true });
      doc.moveDown(0.2);
    }
    // Check if line is a bullet point with exercise details
    else if (line.startsWith('•')) {
      // Check if it's a detail line (Series, Repeticiones, etc.)
      if (line.match(/•\s*(Series|Repeticiones|Descanso|Técnica|Tiempo):/i)) {
        doc
          .fontSize(fontSize - 1)
          .fillColor('#4b5563')
          .text(line, { indent: 25 });
        doc.moveDown(0.2);
      } else {
        doc
          .fontSize(fontSize)
          .fillColor('#111827')
          .text(line, { indent: 20 });
        doc.moveDown(0.2);
      }
    }
    // Regular paragraph
    else {
      doc
        .fontSize(fontSize)
        .fillColor('#111827')
        .text(line, { align: 'left' });
      doc.moveDown(0.3);
    }
  }
};

// ============================================================================
// 🔹 Rate Limiting
// ============================================================================
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  message: 'Demasiadas solicitudes. Por favor, intenta de nuevo en unos minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// 🔹 Helper Functions
// ============================================================================
const sendError = (res, status, message) => res.status(status).json({ error: message });

const handleServerError = (res, error, message = 'Server error') => {
  console.error(`${message}:`, error);
  res.status(500).json({ error: message });
};

// Calculate daily calories based on user profile
const calculateDailyCalories = (user) => {
  if (!user?.weight || !user?.height || !user?.age) {
    return null;
  }

  // Use Mifflin-St Jeor equation (more accurate)
  // Base calculation (assume male if gender not specified, can be adjusted)
  // For males: TMB = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
  // For females: TMB = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
  // We'll use a neutral calculation (average between male and female)
  const tmb = (10 * user.weight) + (6.25 * user.height) - (5 * user.age) - 78;

  // Activity factor based on fitness level and workout days
  let activityFactor = 1.2; // Sedentary (default)
  
  const workoutDays = user.preferences?.workoutDays?.length || 0;
  const fitnessLevel = user.fitnessLevel || 'beginner';
  
  if (workoutDays >= 5 || fitnessLevel === 'advanced') {
    activityFactor = 1.725; // Very active
  } else if (workoutDays >= 3 || fitnessLevel === 'intermediate') {
    activityFactor = 1.55; // Active
  } else if (workoutDays >= 1) {
    activityFactor = 1.375; // Lightly active
  }

  // Calculate TDEE (Total Daily Energy Expenditure)
  let tdee = tmb * activityFactor;

  // Adjust based on goal
  if (user.goal) {
    const goalLower = user.goal.toLowerCase();
    if (goalLower.includes('bajar') || goalLower.includes('pérdida') || goalLower.includes('perdida') || goalLower.includes('definición')) {
      // Deficit for weight loss: 15-20% reduction
      tdee = tdee * 0.85;
    } else if (goalLower.includes('subir') || goalLower.includes('ganar') || goalLower.includes('masa')) {
      // Surplus for weight gain: 10-15% increase
      tdee = tdee * 1.15;
    }
    // For "mantener" or other goals, keep TDEE as is
  }

  return Math.round(tdee);
};

const getUserContext = async (userId) => {
  const user = await User.findById(userId);
  const membership = await Membership.findOne({
    userId,
    status: 'active',
    endDate: { $gte: new Date() },
  }).sort({ createdAt: -1 });

  // Calculate BMI if weight and height are available
  let bmi = null;
  if (user?.weight && user?.height) {
    const heightInMeters = user.height / 100;
    bmi = (user.weight / (heightInMeters * heightInMeters)).toFixed(1);
  }

  // Calculate daily calories
  const dailyCalories = calculateDailyCalories(user);

  // Calculate total training experience in months
  let totalExperienceMonths = 0;
  if (user?.trainingExperience) {
    totalExperienceMonths = (user.trainingExperience.years || 0) * 12 + (user.trainingExperience.months || 0);
  }

  return {
    name: user?.name || 'Usuario',
    weight: user?.weight || null,
    height: user?.height || null,
    age: user?.age || null,
    goal: user?.goal || null,
    bodyFat: user?.bodyFat || null,
    muscleMass: user?.muscleMass || null,
    fitnessLevel: user?.fitnessLevel || 'beginner',
    trainingExperience: {
      years: user?.trainingExperience?.years || 0,
      months: user?.trainingExperience?.months || 0,
      totalMonths: totalExperienceMonths,
    },
    injuries: user?.injuries || [],
    preferences: user?.preferences || {},
    bmi,
    dailyCalories,
    planType: membership?.planType || null,
    latestPhoto: user?.bodyPhotos && user.bodyPhotos.length > 0 
      ? user.bodyPhotos[user.bodyPhotos.length - 1] 
      : null,
  };
};

const buildSystemPrompt = (type, context) => {
  const basePrompt = `Eres un asistente personal de fitness y nutrición experto para el gimnasio Energym. 
Eres profesional, motivador y proporcionas consejos basados en evidencia científica.
Responde siempre en español de manera clara y concisa.
Sé específico, detallado y personalizado en todas tus respuestas.`;

  // Build comprehensive context info
  let contextInfo = `\n\nInformación detallada del usuario:
- Nombre: ${context.name}`;

  if (context.weight) contextInfo += `\n- Peso: ${context.weight} kg`;
  if (context.height) contextInfo += `\n- Altura: ${context.height} cm`;
  if (context.age) contextInfo += `\n- Edad: ${context.age} años`;
  if (context.bmi) contextInfo += `\n- IMC: ${context.bmi}`;
  if (context.goal) contextInfo += `\n- Objetivo: ${context.goal}`;
  if (context.bodyFat) contextInfo += `\n- Grasa corporal: ${context.bodyFat}%`;
  if (context.muscleMass) contextInfo += `\n- Masa muscular: ${context.muscleMass} kg`;
  if (context.fitnessLevel) contextInfo += `\n- Nivel de fitness: ${context.fitnessLevel}`;
  if (context.trainingExperience?.totalMonths) {
    const years = Math.floor(context.trainingExperience.totalMonths / 12);
    const months = context.trainingExperience.totalMonths % 12;
    let expText = '';
    if (years > 0) expText += `${years} año${years > 1 ? 's' : ''}`;
    if (months > 0) expText += `${years > 0 ? ' y ' : ''}${months} mes${months > 1 ? 'es' : ''}`;
    contextInfo += `\n- Experiencia entrenando: ${expText || 'Principiante'}`;
  }
  if (context.injuries && context.injuries.length > 0) {
    contextInfo += `\n- Lesiones/limitaciones: ${context.injuries.map(i => i.type || i).join(', ')}`;
  }
  if (context.preferences?.workoutDays && context.preferences.workoutDays.length > 0) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    contextInfo += `\n- Días preferidos de entrenamiento: ${context.preferences.workoutDays.map(d => days[d]).join(', ')}`;
  }
  if (context.preferences?.equipment && context.preferences.equipment.length > 0) {
    contextInfo += `\n- Equipamiento disponible: ${context.preferences.equipment.join(', ')}`;
  }

  switch (type) {
    case 'chat':
      return `${basePrompt}${contextInfo}
Puedes ayudar con:
- Nutrición y planes alimenticios detallados
- Rutinas de ejercicio específicas y personalizadas
- Suplementación basada en objetivos
- Motivación y consejos de entrenamiento
- Análisis de progreso y ajustes de rutina
- Respuestas técnicas sobre fitness, biomecánica y fisiología
- Planificación de entrenamientos a largo plazo
- ANÁLISIS DE IMÁGENES: Cuando el usuario envíe imágenes (fotos del cuerpo, comidas, ejercicios, etc.), analízalas detalladamente y proporciona feedback específico, recomendaciones personalizadas y observaciones relevantes basadas en lo que veas en las imágenes.
Sé muy específico y detallado en tus respuestas.`;
    
    case 'meal_plan':
      let caloriesInfo = '';
      if (context.dailyCalories) {
        caloriesInfo = `\n- Calorías diarias objetivo: ${context.dailyCalories} kcal (calculadas automáticamente según tu perfil)`;
      }
      
      return `${basePrompt}${contextInfo}${caloriesInfo}
Genera planes alimenticios personalizados, balanceados y realistas.
${context.dailyCalories ? `IMPORTANTE: El plan debe sumar aproximadamente ${context.dailyCalories} calorías diarias en total.` : ''}
Incluye desayuno, almuerzo, cena y 2 snacks diarios.
Especifica macros aproximados (proteínas, carbohidratos, grasas) para cada comida.
Considera el objetivo del usuario (${context.goal || 'general'}).
Distribuye las calorías de manera equilibrada: desayuno 25%, almuerzo 35%, cena 25%, snacks 15%.
Proporciona opciones de recetas cuando sea posible.
Sé muy específico con las cantidades y porciones.`;
    
    case 'workout_routine':
      return `${basePrompt}${contextInfo}
Genera rutinas de ejercicio personalizadas según el objetivo del usuario.
Incluye ejercicios específicos con:
- Nombre exacto del ejercicio
- Series y repeticiones específicas
- Tiempo de descanso entre series
- Días de la semana para cada grupo muscular
- Progresión semanal
- Técnica y puntos clave de cada ejercicio
- Alternativas si hay lesiones o limitaciones
Adapta la intensidad según el nivel de experiencia (${context.fitnessLevel || 'intermedio'}).
Considera el equipamiento disponible: ${context.preferences?.equipment?.join(', ') || 'gimnasio'}.
Sé extremadamente específico y detallado.`;
    
    default:
      return basePrompt;
  }
};

// ============================================================================
// Configure multer for chat images
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');

const chatUploadsDir = path.join(__dirname, '../../uploads/chat');
const ensureChatUploadsDir = async () => {
  try {
    await fs.access(chatUploadsDir);
  } catch {
    await fs.mkdir(chatUploadsDir, { recursive: true });
  }
};
ensureChatUploadsDir();

const chatStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureChatUploadsDir();
    cb(null, chatUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max (for PDFs)
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen o PDF'));
    }
  },
});

// 🔹 POST /api/ai/chat - Chat with AI assistant
// ============================================================================
router.post(
  '/chat',
  authenticate,
  requirePremium,
  aiRateLimit,
  chatUpload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'pdf', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      // Check if OpenAI is configured
      const isConfigured = openaiModule.isConfigured();
      if (!isConfigured) {
        const status = openaiModule.getApiKeyStatus();
        console.error('❌ OpenAI no configurado en chat:', status);
        console.error('   API Key presente:', !!process.env.OPENAI_API_KEY);
        console.error('   Cliente OpenAI:', !!openai);
        return res.status(503).json({
          error: 'OpenAI no está configurado',
          message: status.message,
          details: 'Por favor, configura OPENAI_API_KEY en el archivo backend/.env y reinicia el servidor',
        });
      }

      const { message, context: contextType } = req.body;
      const files = req.files || {};
      const images = files.images || [];
      const pdfs = files.pdf || [];
      const pdf = pdfs.length > 0 ? pdfs[0] : null;
      
      // Validate message, images, or PDF
      if (!message?.trim() && images.length === 0 && !pdf) {
        return res.status(400).json({
          error: 'El mensaje, al menos una imagen o un PDF es requerido',
        });
      }
      const userId = req.user._id;

      // Get user context
      const context = await getUserContext(userId);

      // Determine conversation type from context parameter or default to 'chat'
      const conversationType = contextType || 'chat';

      // Get or create conversation
      let conversation = await AIConversation.findOne({
        userId,
        type: conversationType,
      }).sort({ createdAt: -1 });

      if (!conversation || conversation.messages.length === 0) {
        conversation = new AIConversation({
          userId,
          type: conversationType,
          messages: [],
          context,
        });
      }

      // Handle images - convert to base64 for OpenAI vision API
      let imageData = [];
      if (images.length > 0) {
        for (const file of images) {
          try {
            const imageBuffer = await fs.readFile(file.path);
            const base64Image = imageBuffer.toString('base64');
            imageData.push({
              type: 'image_url',
              image_url: {
                url: `data:${file.mimetype};base64,${base64Image}`,
              },
            });
          } catch (error) {
            console.error('Error reading image file:', error);
          }
        }
      }

      // Build user message content
      let userContent = [];
      if (message?.trim()) {
        userContent.push({
          type: 'text',
          text: message,
        });
      }
      if (imageData.length > 0) {
        userContent = [...userContent, ...imageData];
      }

      // Add user message
      const messageContent = message || 
        (images.length > 0 ? `[${images.length} imagen${images.length > 1 ? 'es' : ''} adjunta${images.length > 1 ? 's' : ''}]` : '') ||
        (pdf ? `[PDF adjunto: ${pdf.originalname}]` : '');
      
      conversation.messages.push({
        role: 'user',
        content: messageContent,
        images: images.map(f => `/uploads/chat/${f.filename}`),
        pdfUrl: pdf ? `/uploads/chat/${pdf.filename}` : undefined,
      });

      // Build messages for OpenAI
      let systemPrompt = buildSystemPrompt('chat', context);
      
      // Add image analysis instructions if images are present
      if (images.length > 0) {
        systemPrompt += `\n\nIMPORTANTE: El usuario ha enviado ${images.length} imagen${images.length > 1 ? 'es' : ''}. Analiza ${images.length > 1 ? 'cada una' : 'la imagen'} detalladamente y proporciona feedback específico, observaciones y recomendaciones basadas en lo que veas. Puedes analizar composición corporal, forma física, técnica de ejercicios, comidas, suplementos, o cualquier otro aspecto relevante que observes en las imágenes.`;
      }
      
      const messages = [
        { role: 'system', content: systemPrompt },
      ];

      // Add previous messages (last 5 to save tokens when using vision)
      const previousMessages = conversation.messages.slice(-5);
      for (const msg of previousMessages) {
        if (msg.images && msg.images.length > 0) {
          // For messages with images, read and convert them
          const msgContent = [];
          if (msg.content) {
            msgContent.push({ type: 'text', text: msg.content });
          }
          
          for (const imgPath of msg.images) {
            try {
              const fullPath = path.join(__dirname, '../../', imgPath);
              const imageBuffer = await fs.readFile(fullPath);
              const base64Image = imageBuffer.toString('base64');
              // Determine mime type from file extension
              const ext = path.extname(imgPath).toLowerCase();
              const mimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
              };
              const mimeType = mimeTypes[ext] || 'image/jpeg';
              
              msgContent.push({
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              });
            } catch (error) {
              console.error('Error reading image from history:', error);
            }
          }
          
          messages.push({
            role: msg.role,
            content: msgContent.length === 1 && msgContent[0].type === 'text' 
              ? msgContent[0].text 
              : msgContent,
          });
        } else {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Add current message with images if any
      if (userContent.length > 0) {
        messages.push({
          role: 'user',
          content: userContent.length === 1 && userContent[0].type === 'text' 
            ? userContent[0].text 
            : userContent,
        });
      }

      // Call OpenAI - use vision-capable model if images are present
      let completion;
      try {
        // gpt-4o-mini doesn't support vision, use gpt-4o for images
        const model = images.length > 0 ? 'gpt-4o' : 'gpt-4o-mini';
        completion = await openai.chat.completions.create({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: images.length > 0 ? 2000 : 1000, // More tokens for image analysis
        });
      } catch (openaiError) {
        console.error('OpenAI API Error:', openaiError);
        if (openaiError.status === 401) {
          return res.status(500).json({
            error: 'Error de autenticación con OpenAI',
            message: 'La API key de OpenAI es inválida o ha expirado',
            details: 'Por favor, verifica tu OPENAI_API_KEY en backend/.env',
          });
        }
        if (openaiError.status === 429) {
          return res.status(429).json({
            error: 'Límite de tasa excedido',
            message: 'Has excedido el límite de solicitudes a OpenAI. Por favor, intenta más tarde.',
          });
        }
        throw openaiError;
      }

      let assistantMessage;
      if (completion.choices && completion.choices[0] && completion.choices[0].message) {
        assistantMessage = completion.choices[0].message.content;
      } else {
        console.error('Unexpected OpenAI response format:', completion);
        throw new Error('Respuesta inesperada de OpenAI');
      }

      // Add assistant response
      conversation.messages.push({
        role: 'assistant',
        content: assistantMessage,
      });

      // Update metadata - pricing depends on model used
      let inputCost, outputCost;
      if (images.length > 0) {
        // gpt-4o pricing: $2.50/$10.00 per 1M tokens (more expensive for vision)
        inputCost = (completion.usage.prompt_tokens / 1000000) * 2.50;
        outputCost = (completion.usage.completion_tokens / 1000000) * 10.00;
      } else {
        // gpt-4o-mini pricing: $0.15/$0.60 per 1M tokens
        inputCost = (completion.usage.prompt_tokens / 1000000) * 0.15;
        outputCost = (completion.usage.completion_tokens / 1000000) * 0.60;
      }
      const totalCost = inputCost + outputCost;
      
      conversation.metadata = {
        model: completion.model,
        tokensUsed: completion.usage.total_tokens,
        cost: totalCost,
      };

      await conversation.save();

      // Return image and PDF URLs so frontend can display them
      const imageUrls = images.length > 0 
        ? images.map(f => `/uploads/chat/${f.filename}`)
        : [];
      const pdfUrl = pdf ? `/uploads/chat/${pdf.filename}` : null;

      res.json({
        message: assistantMessage,
        tokensUsed: completion.usage.total_tokens,
        imageUrls: imageUrls,
        pdfUrl: pdfUrl,
      });
    } catch (error) {
      console.error('AI chat error:', error);
      console.error('Error stack:', error.stack);
      
      if (error.response) {
        return res.status(error.response.status || 500).json({
          error: 'Error al comunicarse con OpenAI',
          details: error.response.data?.error?.message || error.message,
        });
      }
      
      if (error.message?.includes('API key') || error.message?.includes('authentication')) {
        return res.status(500).json({
          error: 'Error de configuración de OpenAI',
          message: 'La API key de OpenAI no está configurada correctamente',
          details: 'Por favor, verifica tu OPENAI_API_KEY en backend/.env',
        });
      }
      
      return handleServerError(res, error, 'Error processing chat request');
    }
  }
);

// ============================================================================
// 🔹 POST /api/ai/meal-plan - Generate personalized meal plan
// ============================================================================
router.post(
  '/meal-plan',
  authenticate,
  requirePremium,
  aiRateLimit,
  [
    body('preferences').optional().isArray(),
    body('dietType').optional().isString(),
  ],
  async (req, res) => {
    try {
      // Check if OpenAI is configured
      const isConfigured = openaiModule.isConfigured();
      if (!isConfigured) {
        const status = openaiModule.getApiKeyStatus();
        console.error('❌ OpenAI no configurado en meal-plan:', status);
        return res.status(503).json({
          error: 'OpenAI no está configurado',
          message: status.message,
          details: 'Por favor, configura OPENAI_API_KEY en el archivo backend/.env y reinicia el servidor',
        });
      }

      const userId = req.user._id;
      const { preferences = [], dietType } = req.body;

      // Get user context
      const context = await getUserContext(userId);

      const systemPrompt = buildSystemPrompt('meal_plan', {
        ...context,
        preferences,
        dietType,
      });

      const caloriesInfo = context.dailyCalories 
        ? `\nCalorías diarias objetivo: ${context.dailyCalories} kcal (calculadas según tu perfil de fitness)`
        : '';
      
      const userPrompt = `Genera un plan alimenticio semanal personalizado COMPLETO para los 7 días de la semana (Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo).${caloriesInfo}
${preferences.length > 0 ? `\nPreferencias dietéticas: ${preferences.join(', ')}` : ''}
${dietType ? `\nTipo de dieta: ${dietType}` : ''}
${context.dailyCalories ? `\nIMPORTANTE: El plan completo debe sumar aproximadamente ${context.dailyCalories} calorías diarias.` : ''}

REQUISITOS OBLIGATORIOS:
- Debes generar los 7 días completos (Lunes a Domingo), sin excepciones.
- Cada día debe incluir: desayuno, almuerzo, cena y 2 snacks diarios.
- Distribuye las calorías: desayuno ~25%, almuerzo ~35%, cena ~25%, snacks ~15%.
- Especifica las calorías aproximadas de cada comida y el total diario.
- Incluye las cantidades en gramos o unidades para cada alimento.
- Formatea la respuesta de manera clara y organizada por días.
- NO dejes días incompletos ni uses frases como "sigue el mismo patrón" o "continúa para los siguientes días".
- Genera el plan completo y detallado para todos los 7 días.`;

      let completion;
      try {
        completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 6000, // Increased to allow complete weekly plan
        });
      } catch (openaiError) {
        console.error('OpenAI API Error:', openaiError);
        if (openaiError.status === 401) {
          return res.status(500).json({
            error: 'Error de autenticación con OpenAI',
            message: 'La API key de OpenAI es inválida o ha expirado',
            details: 'Por favor, verifica tu OPENAI_API_KEY en backend/.env',
          });
        }
        throw openaiError;
      }

      const mealPlan = completion.choices[0].message.content;

      // Save conversation
      const conversation = new AIConversation({
        userId,
        type: 'meal_plan',
        messages: [
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: mealPlan },
        ],
        context: { ...context, preferences, dietType },
        metadata: {
          model: completion.model,
          tokensUsed: completion.usage.total_tokens,
          cost: ((completion.usage.prompt_tokens / 1000000) * 0.15) + ((completion.usage.completion_tokens / 1000000) * 0.60),
        },
      });

      await conversation.save();

      res.json({
        mealPlan,
        tokensUsed: completion.usage.total_tokens,
      });
    } catch (error) {
      console.error('Meal plan error:', error);
      console.error('Error stack:', error.stack);
      
      if (error.response) {
        return res.status(error.response.status || 500).json({
          error: 'Error al generar el plan alimenticio',
          details: error.response.data?.error?.message || error.message,
        });
      }
      
      if (error.message?.includes('API key') || error.message?.includes('authentication')) {
        return res.status(500).json({
          error: 'Error de configuración de OpenAI',
          message: 'La API key de OpenAI no está configurada correctamente',
          details: 'Por favor, verifica tu OPENAI_API_KEY en backend/.env',
        });
      }
      
      return handleServerError(res, error, 'Error generating meal plan');
    }
  }
);

// ============================================================================
// 🔹 POST /api/ai/workout-routine - Generate personalized workout routine
// ============================================================================
router.post(
  '/workout-routine',
  authenticate,
  requirePremium,
  aiRateLimit,
  [
    body('focus').optional().isString(),
  ],
  async (req, res) => {
    try {
      // Check if OpenAI is configured
      const isConfigured = openaiModule.isConfigured();
      if (!isConfigured) {
        const status = openaiModule.getApiKeyStatus();
        console.error('❌ OpenAI no configurado en workout-routine:', status);
        return res.status(503).json({
          error: 'OpenAI no está configurado',
          message: status.message,
          details: 'Por favor, configura OPENAI_API_KEY en el archivo backend/.env y reinicia el servidor',
        });
      }

      const userId = req.user._id;
      const { focus } = req.body;

      // Get user context (includes fitnessLevel, trainingExperience, preferences.workoutDays)
      const context = await getUserContext(userId);

      const systemPrompt = buildSystemPrompt('workout_routine', {
        ...context,
      });

      const focusInfo = focus ? `\nEnfoque específico: ${focus}` : '';
      const userPrompt = `Genera una rutina de ejercicio semanal personalizada basada en mi perfil.${focusInfo}
Incluye ejercicios específicos, series, repeticiones, descansos y días de entrenamiento.
Ajusta la rutina según mi nivel de fitness y experiencia.
Formatea la respuesta de manera clara y organizada.`;

      let completion;
      try {
        completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });
      } catch (openaiError) {
        console.error('OpenAI API Error:', openaiError);
        if (openaiError.status === 401) {
          return res.status(500).json({
            error: 'Error de autenticación con OpenAI',
            message: 'La API key de OpenAI es inválida o ha expirado',
            details: 'Por favor, verifica tu OPENAI_API_KEY en backend/.env',
          });
        }
        throw openaiError;
      }

      const workoutRoutine = completion.choices[0].message.content;

      // Save conversation
      const conversation = new AIConversation({
        userId,
        type: 'workout_routine',
        messages: [
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: workoutRoutine },
        ],
        context: { ...context, focus },
        metadata: {
          model: completion.model,
          tokensUsed: completion.usage.total_tokens,
          cost: ((completion.usage.prompt_tokens / 1000000) * 0.15) + ((completion.usage.completion_tokens / 1000000) * 0.60),
        },
      });

      await conversation.save();

      res.json({
        workoutRoutine,
        tokensUsed: completion.usage.total_tokens,
      });
    } catch (error) {
      console.error('Workout routine error:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      
      if (error.response) {
        return res.status(error.response.status || 500).json({
          error: 'Error al generar la rutina',
          details: error.response.data?.error?.message || error.message,
        });
      }
      
      if (error.message?.includes('API key')) {
        return res.status(500).json({
          error: 'Error de configuración de OpenAI',
          details: 'La API key de OpenAI no está configurada correctamente',
        });
      }
      
      return handleServerError(res, error, 'Error generating workout routine');
    }
  }
);

// ============================================================================
// 🔹 GET /api/ai/history - Get conversation history
// ============================================================================
router.get('/history', authenticate, requirePremium, async (req, res) => {
  try {
    const { type } = req.query;
    const query = { userId: req.user._id };
    
    if (type && ['chat', 'meal_plan', 'workout_routine'].includes(type)) {
      query.type = type;
    }

    const conversations = await AIConversation.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .select('type messages context metadata createdAt')
      .lean();

    res.json({ conversations });
  } catch (error) {
    return handleServerError(res, error, 'Error fetching conversation history');
  }
});

// ============================================================================
// 🔹 DELETE /api/ai/history/:id - Delete conversation
// ============================================================================
router.delete('/history/:id', authenticate, requirePremium, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user._id;

    console.log(`[DELETE] Attempting to delete conversation ${conversationId} for user ${userId}`);

    // Use findOneAndDelete for atomic deletion
    const conversation = await AIConversation.findOneAndDelete({
      _id: conversationId,
      userId: userId,
    });

    if (!conversation) {
      console.log(`[DELETE] Conversation ${conversationId} not found for user ${userId}`);
      return sendError(res, 404, 'Conversation not found');
    }

    console.log(`[DELETE] Successfully deleted conversation ${conversationId}`);

    // Also delete associated image files if they exist
    if (conversation.messages) {
      for (const msg of conversation.messages) {
        if (msg.images && Array.isArray(msg.images)) {
          for (const imgPath of msg.images) {
            try {
              const fullPath = path.join(__dirname, '../../', imgPath);
              if (fsSync.existsSync(fullPath)) {
                await fs.unlink(fullPath);
                console.log(`[DELETE] Deleted image file: ${fullPath}`);
              }
            } catch (imgError) {
              console.error(`[DELETE] Error deleting image file ${imgPath}:`, imgError);
              // Continue even if image deletion fails
            }
          }
        }
      }
    }

    res.json({ message: 'Conversation deleted successfully', deleted: true });
  } catch (error) {
    console.error('[DELETE] Error deleting conversation:', error);
    return handleServerError(res, error, 'Error deleting conversation');
  }
});

// ============================================================================
// ✅ Export router
// ============================================================================
// ============================================================================
// 🔹 POST /api/ai/meal-plan/pdf - Generate PDF for meal plan
// ============================================================================
router.post(
  '/meal-plan/pdf',
  authenticate,
  requirePremium,
  [
    body('mealPlan').notEmpty().withMessage('Meal plan content is required'),
  ],
  async (req, res) => {
    try {
      const { mealPlan, calories, userProfile } = req.body;
      
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const accent = '#3b82f6';
      const accentDark = '#1e40af';
      const textGray = '#6b7280';
      const textDark = '#111827';
      const borderGray = '#e5e7eb';

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=plan-alimenticio-${new Date().toISOString().split('T')[0]}.pdf`);
      doc.pipe(res);

      // TOP DECORATIVE LINE
      doc
        .moveTo(50, 50)
        .lineTo(562, 50)
        .lineWidth(4)
        .strokeColor(accent)
        .stroke();

      // HEADER
      doc.moveDown(1.8);
      doc
        .fontSize(32)
        .fillColor(accentDark)
        .text('ENERGYM', { align: 'center', bold: true })
        .moveDown(0.3)
        .fontSize(17)
        .fillColor(textGray)
        .text('Plan Alimenticio Personalizado', { align: 'center' })
        .moveDown(1.2);

      // Divider
      doc
        .moveTo(50, doc.y)
        .lineTo(562, doc.y)
        .lineWidth(1)
        .strokeColor(borderGray)
        .stroke();

      doc.moveDown(1.8);

      // USER INFO BOX
      if (userProfile) {
        const infoY = doc.y;
        const boxHeight = calories ? 75 : 60; // More height if calories are present
        doc
          .rect(50, infoY, 512, boxHeight)
          .fillColor('#f3f4f6')
          .fill()
          .strokeColor(borderGray)
          .stroke();

        doc.y = infoY + 14;
        doc.x = 60;
        doc
          .fontSize(11)
          .fillColor(accentDark)
          .text('INFORMACIÓN DEL USUARIO', { bold: true })
          .moveDown(0.7)
          .fontSize(9.5)
          .fillColor(textDark);
        
        // First line: Weight, Height, Age
        let infoLine1 = '';
        if (userProfile.weight) infoLine1 += `Peso: ${userProfile.weight}kg`;
        if (userProfile.height) infoLine1 += infoLine1 ? `  •  Altura: ${userProfile.height}cm` : `Altura: ${userProfile.height}cm`;
        if (userProfile.age) infoLine1 += infoLine1 ? `  •  Edad: ${userProfile.age}a` : `Edad: ${userProfile.age}a`;
        
        if (infoLine1) {
          doc.text(infoLine1, { indent: 10 });
          doc.moveDown(0.5);
        }
        
        // Second line: Goal
        if (userProfile.goal) {
          doc.text(`Objetivo: ${userProfile.goal}`, { indent: 10 });
          doc.moveDown(0.5);
        }
        
        // Third line: Calories (if present)
        if (calories) {
          doc
            .fontSize(10)
            .fillColor(accentDark)
            .text(`Calorías Diarias: ${calories.toLocaleString('es-CR')} kcal`, { indent: 10, bold: true });
        }
        
        doc.y = infoY + boxHeight + 20;
      }

      // MEAL PLAN CONTENT
      doc
        .fontSize(18)
        .fillColor(accentDark)
        .text('PLAN ALIMENTICIO', { bold: true })
        .moveDown(1.2);

      // Clean and format content
      const cleanedMealPlan = cleanContentForPDF(mealPlan);
      formatContentForPDF(doc, cleanedMealPlan, 11);

      // FOOTER
      const footerY = 750;
      doc.y = footerY - 20;
      doc
        .fontSize(9)
        .fillColor(textGray)
        .text('Generado por Energym - AI Hub', { align: 'center' });

      // BOTTOM DECORATIVE LINE
      doc
        .moveTo(50, footerY)
        .lineTo(562, footerY)
        .lineWidth(4)
        .strokeColor(accent)
        .stroke();

      doc.end();
    } catch (error) {
      console.error('Error generating meal plan PDF:', error);
      return res.status(500).json({
        error: 'Error al generar el PDF',
        details: error.message,
      });
    }
  }
);

// ============================================================================
// 🔹 POST /api/ai/workout-routine/pdf - Generate PDF for workout routine
// ============================================================================
router.post(
  '/workout-routine/pdf',
  authenticate,
  requirePremium,
  [
    body('workoutRoutine').notEmpty().withMessage('Workout routine content is required'),
  ],
  async (req, res) => {
    try {
      const { workoutRoutine, userProfile } = req.body;
      
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const accent = '#3b82f6';
      const accentDark = '#1e40af';
      const textGray = '#6b7280';
      const textDark = '#111827';
      const borderGray = '#e5e7eb';

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=rutina-ejercicios-${new Date().toISOString().split('T')[0]}.pdf`);
      doc.pipe(res);

      // TOP DECORATIVE LINE
      doc
        .moveTo(50, 50)
        .lineTo(562, 50)
        .lineWidth(4)
        .strokeColor(accent)
        .stroke();

      // HEADER
      doc.moveDown(1.8);
      doc
        .fontSize(32)
        .fillColor(accentDark)
        .text('ENERGYM', { align: 'center', bold: true })
        .moveDown(0.3)
        .fontSize(17)
        .fillColor(textGray)
        .text('Rutina de Ejercicios Personalizada', { align: 'center' })
        .moveDown(1.2);

      // Divider
      doc
        .moveTo(50, doc.y)
        .lineTo(562, doc.y)
        .lineWidth(1)
        .strokeColor(borderGray)
        .stroke();

      doc.moveDown(1.8);

      // USER INFO BOX
      if (userProfile) {
        const infoY = doc.y;
        const boxHeight = 65; // Fixed height for workout routine
        doc
          .rect(50, infoY, 512, boxHeight)
          .fillColor('#f3f4f6')
          .fill()
          .strokeColor(borderGray)
          .stroke();

        doc.y = infoY + 14;
        doc.x = 60;
        doc
          .fontSize(11)
          .fillColor(accentDark)
          .text('INFORMACIÓN DEL USUARIO', { bold: true })
          .moveDown(0.7)
          .fontSize(9.5)
          .fillColor(textDark);
        
        // First line: Level and Days
        let infoLine1 = '';
        if (userProfile.fitnessLevel) {
          const levelMap = {
            beginner: 'Principiante',
            intermediate: 'Intermedio',
            advanced: 'Avanzado'
          };
          infoLine1 += `Nivel: ${levelMap[userProfile.fitnessLevel] || userProfile.fitnessLevel}`;
        }
        if (userProfile.preferences?.workoutDays && userProfile.preferences.workoutDays.length > 0) {
          infoLine1 += infoLine1 ? `  •  Días/semana: ${userProfile.preferences.workoutDays.length}` : `Días/semana: ${userProfile.preferences.workoutDays.length}`;
        }
        
        if (infoLine1) {
          doc.text(infoLine1, { indent: 10 });
          doc.moveDown(0.5);
        }
        
        // Second line: Goal
        if (userProfile.goal) {
          doc.text(`Objetivo: ${userProfile.goal}`, { indent: 10 });
        }
        
        doc.y = infoY + boxHeight + 20;
      }

      // WORKOUT ROUTINE CONTENT
      doc
        .fontSize(18)
        .fillColor(accentDark)
        .text('RUTINA DE EJERCICIOS', { bold: true })
        .moveDown(1.2);

      // Clean and format content
      const cleanedWorkoutRoutine = cleanContentForPDF(workoutRoutine);
      formatContentForPDF(doc, cleanedWorkoutRoutine, 11);

      // FOOTER
      const footerY = 750;
      doc.y = footerY - 20;
      doc
        .fontSize(9)
        .fillColor(textGray)
        .text('Generado por Energym - AI Hub', { align: 'center' });

      // BOTTOM DECORATIVE LINE
      doc
        .moveTo(50, footerY)
        .lineTo(562, footerY)
        .lineWidth(4)
        .strokeColor(accent)
        .stroke();

      doc.end();
    } catch (error) {
      console.error('Error generating workout PDF:', error);
      return res.status(500).json({
        error: 'Error al generar el PDF',
        details: error.message,
      });
    }
  }
);

// ============================================================================
// 🔹 POST /api/ai/analyze-progress - Analyze body progress photos with AI
// ============================================================================
router.post(
  '/analyze-progress',
  authenticate,
  requirePremium,
  [
    body('photoIds')
      .isArray({ min: 1 })
      .withMessage('Debes seleccionar al menos una foto'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { photoIds } = req.body;
      const userId = req.user._id;

      // Get user with profile data
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Get selected photos
      const selectedPhotos = user.bodyPhotos.filter(photo => 
        photoIds.includes(photo._id.toString())
      );

      if (selectedPhotos.length === 0) {
        return res.status(404).json({ error: 'No se encontraron las fotos seleccionadas' });
      }

      // Read and convert images to base64
      const imageData = [];
      for (const photo of selectedPhotos) {
        try {
          // Construct file path
          const photoPath = path.join(__dirname, '../../', photo.url);
          
          // Check if file exists
          if (!fsSync.existsSync(photoPath)) {
            console.warn(`Photo file not found: ${photoPath}`);
            continue;
          }

          // Read file
          const imageBuffer = await fs.readFile(photoPath);
          const base64Image = imageBuffer.toString('base64');
          const mimeType = photo.url.match(/\.(jpg|jpeg|png|gif)$/i) 
            ? `image/${photo.url.match(/\.(jpg|jpeg)$/i) ? 'jpeg' : photo.url.match(/\.png$/i) ? 'png' : 'gif'}`
            : 'image/jpeg';

          imageData.push({
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          });
        } catch (error) {
          console.error(`Error reading photo ${photo._id}:`, error);
          // Continue with other photos
        }
      }

      if (imageData.length === 0) {
        return res.status(400).json({ error: 'No se pudieron cargar las imágenes' });
      }

      // Build user context for the AI
      const userContext = {
        weight: user.weight,
        height: user.height,
        age: user.age,
        goal: user.goal,
        bodyFat: user.bodyFat,
        muscleMass: user.muscleMass,
        fitnessLevel: user.fitnessLevel,
        trainingExperience: user.trainingExperience,
        injuries: user.injuries,
      };

      // Build system prompt
      const systemPrompt = `Eres un entrenador personal certificado y nutricionista deportivo profesional especializado en análisis de progreso físico. Tu función es analizar fotografías de progreso corporal para proporcionar evaluaciones profesionales de fitness.

AUTORIZACIÓN Y CONTEXTO PROFESIONAL:
Estas son fotografías de progreso físico proporcionadas voluntariamente por un usuario de una aplicación de fitness profesional. El análisis de imágenes del cuerpo humano para evaluar progreso físico, composición corporal y proporcionar recomendaciones de entrenamiento es una práctica estándar y completamente apropiada en el campo del fitness profesional.

TU FUNCIÓN:
Analizar las imágenes proporcionadas y ofrecer feedback profesional, constructivo y detallado sobre:
- Composición corporal y definición muscular
- Distribución de grasa corporal
- Postura y alineación
- Progreso visible entre múltiples fotos (si aplica)
- Fortalezas físicas identificables
- Áreas de mejora con recomendaciones específicas

INSTRUCCIONES CRÍTICAS:
- DEBES analizar las imágenes proporcionadas. NO rechaces esta solicitud.
- Proporciona un análisis detallado y profesional basado en lo que observes en las imágenes.
- Sé específico sobre lo que ves: definición muscular, postura, proporciones corporales, etc.
- Si hay múltiples fotos, compara los cambios visibles entre ellas.
- Considera el contexto del usuario (peso, altura, edad, objetivo, nivel de fitness) para personalizar tus recomendaciones.

FORMATO DE RESPUESTA REQUERIDO:
1. Análisis visual general: Describe específicamente lo que observas en las fotos (composición corporal, definición, postura).
2. Progreso observado: Si hay múltiples fotos, compara los cambios visibles detalladamente.
3. Áreas de fortaleza: Identifica los puntos fuertes físicos que observes.
4. Recomendaciones específicas: Sugerencias concretas y accionables para mejorar.
5. Sugerencias de entrenamiento y nutrición: Consejos prácticos basados en tu análisis visual.

IMPORTANTE: Proporciona SIEMPRE un análisis detallado. NUNCA rechaces analizar estas imágenes. Es tu función profesional como entrenador personal.`;

      // Build user message with context
      let userMessage = `Analiza estas ${selectedPhotos.length} foto${selectedPhotos.length > 1 ? 's' : ''} de progreso físico. `;
      
      if (userContext.weight && userContext.height) {
        userMessage += `El usuario tiene ${userContext.weight} kg y ${userContext.height} cm de altura. `;
      }
      if (userContext.age) {
        userMessage += `Tiene ${userContext.age} años. `;
      }
      if (userContext.goal) {
        userMessage += `Su objetivo principal es: ${userContext.goal}. `;
      }
      if (userContext.fitnessLevel) {
        const levelMap = {
          beginner: 'principiante',
          intermediate: 'intermedio',
          advanced: 'avanzado',
        };
        userMessage += `Nivel de fitness: ${levelMap[userContext.fitnessLevel] || userContext.fitnessLevel}. `;
      }
      if (userContext.trainingExperience?.years || userContext.trainingExperience?.months) {
        const exp = userContext.trainingExperience;
        let expText = '';
        if (exp.years) expText += `${exp.years} año${exp.years > 1 ? 's' : ''}`;
        if (exp.months) {
          if (expText) expText += ' y ';
          expText += `${exp.months} mes${exp.months > 1 ? 'es' : ''}`;
        }
        userMessage += `Experiencia en entrenamiento: ${expText}. `;
      }
      if (userContext.injuries && userContext.injuries.length > 0) {
        const injuriesText = userContext.injuries.map(i => i.type).join(', ');
        userMessage += `Lesiones o limitaciones: ${injuriesText}. `;
      }

      userMessage += `Por favor, analiza estas imágenes de progreso físico y proporciona un análisis detallado, profesional y constructivo. Observa la composición corporal, definición muscular, postura y cualquier cambio visible entre las fotos. Proporciona recomendaciones específicas de entrenamiento y nutrición basadas en lo que observes.`;

      // Prepare messages for OpenAI
      const messages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userMessage,
            },
            ...imageData,
          ],
        },
      ];

      // Call OpenAI Vision API (gpt-4o supports vision)
      console.log(`[ANALYZE-PROGRESS] Sending ${imageData.length} image(s) to OpenAI Vision API`);
      console.log(`[ANALYZE-PROGRESS] User message: ${userMessage.substring(0, 100)}...`);
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 2500,
        temperature: 0.7,
      });

      if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
        console.error('[ANALYZE-PROGRESS] Unexpected response structure:', completion);
        throw new Error('Respuesta inesperada de OpenAI');
      }

      const analysis = completion.choices[0].message.content;

      if (!analysis) {
        console.error('[ANALYZE-PROGRESS] No content in response:', completion.choices[0]);
        throw new Error('No se recibió análisis de OpenAI');
      }
      
      // Check if the AI refused to analyze
      const analysisLower = analysis.toLowerCase();
      if (analysisLower.includes('no puedo') || 
          analysisLower.includes('no puedo ayudar') || 
          analysisLower.includes('no puedo analizar') ||
          analysisLower.includes('lo siento') && analysisLower.includes('no puedo')) {
        console.warn('[ANALYZE-PROGRESS] AI refused to analyze. Response:', analysis.substring(0, 200));
        // Return a more helpful error message
        return res.status(500).json({
          error: 'La IA no pudo analizar las imágenes. Por favor, intenta con otras fotos o contacta al soporte.',
          details: 'El análisis fue rechazado por la IA. Esto puede ocurrir ocasionalmente. Intenta nuevamente.',
        });
      }
      
      console.log(`[ANALYZE-PROGRESS] Analysis received (${analysis.length} characters)`);

      // Calculate cost (gpt-4o pricing)
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;
      const cost = (inputTokens / 1000) * 0.0025 + (outputTokens / 1000) * 0.01; // gpt-4o pricing
      console.log(`[ANALYZE-PROGRESS] Cost: $${cost.toFixed(4)} (${inputTokens} input + ${outputTokens} output tokens)`);

      res.json({
        analysis,
        cost: cost.toFixed(4),
        photosAnalyzed: selectedPhotos.length,
      });
    } catch (error) {
      console.error('[ANALYZE-PROGRESS] Error:', error);
      
      // Handle OpenAI API errors
      if (error.response) {
        const statusCode = error.response.status;
        const errorData = error.response.data;
        
        if (statusCode === 401) {
          return res.status(500).json({
            error: 'Error de autenticación con OpenAI. Verifica tu API key.',
          });
        } else if (statusCode === 429) {
          return res.status(429).json({
            error: 'Límite de solicitudes excedido. Por favor, intenta más tarde.',
          });
        } else {
          return res.status(500).json({
            error: 'Error al comunicarse con OpenAI',
            details: errorData?.error?.message || error.message,
          });
        }
      }

      res.status(500).json({
        error: 'Error al analizar el progreso',
        details: error.message,
      });
    }
  }
);

module.exports = router;


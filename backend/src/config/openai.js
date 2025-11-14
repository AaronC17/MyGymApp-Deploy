const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables explicitly
// This ensures .env is loaded before reading OPENAI_API_KEY
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Validate API key
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey || apiKey.trim() === '') {
  console.error('❌ ERROR: OPENAI_API_KEY no está configurada en las variables de entorno');
  console.error('   Por favor, agrega OPENAI_API_KEY=tu-api-key en el archivo backend/.env');
} else if (!apiKey.startsWith('sk-')) {
  console.warn('⚠️  ADVERTENCIA: La API key de OpenAI parece inválida (debe comenzar con "sk-")');
} else {
  console.log('✅ OpenAI API Key configurada correctamente');
}

// Initialize OpenAI client
let openai = null;
if (apiKey && apiKey.trim() !== '' && apiKey.startsWith('sk-')) {
  try {
    openai = new OpenAI({
      apiKey: apiKey,
    });
    console.log('✅ Cliente OpenAI inicializado correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar OpenAI:', error.message);
    openai = null;
  }
} else {
  console.warn('⚠️  No se puede inicializar OpenAI: API key inválida o no configurada');
}

// Helper function to check if OpenAI is configured
const isConfigured = () => {
  const hasKey = apiKey && apiKey.trim() !== '';
  const hasValidPrefix = apiKey && apiKey.startsWith('sk-');
  const clientExists = openai !== null;
  
  if (!hasKey) {
    console.log('🔍 Debug: API key no encontrada');
    return false;
  }
  if (!hasValidPrefix) {
    console.log('🔍 Debug: API key no tiene prefijo válido');
    return false;
  }
  if (!clientExists) {
    console.log('🔍 Debug: Cliente OpenAI no inicializado');
    return false;
  }
  
  return true;
};

module.exports = openai;
module.exports.isConfigured = isConfigured;
module.exports.getApiKeyStatus = () => {
  if (!apiKey || apiKey.trim() === '') {
    return { configured: false, message: 'API key no configurada' };
  }
  if (!apiKey.startsWith('sk-')) {
    return { configured: false, message: 'API key inválida (debe comenzar con "sk-")' };
  }
  return { configured: true, message: 'API key configurada correctamente' };
};


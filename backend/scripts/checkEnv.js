// Script para verificar todas las variables de entorno requeridas
require('dotenv').config();

console.log('\n🔍 Verificando variables de entorno requeridas...\n');

const requiredVars = {
  'JWT_SECRET': {
    required: true,
    minLength: 32,
    description: 'Clave secreta para firmar tokens JWT',
  },
  'OPENAI_API_KEY': {
    required: true,
    startsWith: 'sk-',
    description: 'API key de OpenAI para AI Hub',
  },
};

const optionalVars = {
  'MONGODB_URI': 'URI de conexión a MongoDB',
  'COSMOS_DB_CONNECTION_STRING': 'String de conexión a Cosmos DB',
  'AZURE_STORAGE_CONNECTION_STRING': 'String de conexión a Azure Blob Storage',
  'AZURE_COMMUNICATION_CONNECTION_STRING': 'String de conexión a Azure Communication Services',
  'PORT': 'Puerto del servidor (default: 3000)',
  'JWT_EXPIRES_IN': 'Tiempo de expiración del token (default: 24h)',
};

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('📋 Variables Requeridas:');
console.log('─'.repeat(50));

for (const [varName, config] of Object.entries(requiredVars)) {
  const value = process.env[varName];
  
  if (!value || value.trim() === '') {
    console.error(`❌ ${varName}: NO CONFIGURADA`);
    console.error(`   ${config.description}`);
    hasErrors = true;
  } else {
    let isValid = true;
    
    if (config.minLength && value.length < config.minLength) {
      console.warn(`⚠️  ${varName}: Muy corta (${value.length} caracteres, mínimo ${config.minLength})`);
      hasWarnings = true;
      isValid = false;
    }
    
    if (config.startsWith && !value.startsWith(config.startsWith)) {
      console.error(`❌ ${varName}: Formato inválido (debe comenzar con "${config.startsWith}")`);
      hasErrors = true;
      isValid = false;
    }
    
    if (isValid) {
      const displayValue = varName.includes('SECRET') || varName.includes('KEY')
        ? `${value.substring(0, 10)}... (${value.length} caracteres)`
        : value;
      console.log(`✅ ${varName}: ${displayValue}`);
    }
  }
}

// Check optional variables
console.log('\n📋 Variables Opcionales:');
console.log('─'.repeat(50));

for (const [varName, description] of Object.entries(optionalVars)) {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: Configurada`);
  } else {
    console.log(`⚪ ${varName}: No configurada (${description})`);
  }
}

// Summary
console.log('\n' + '═'.repeat(50));
if (hasErrors) {
  console.error('\n❌ HAY ERRORES: Por favor, corrige las variables marcadas con ❌');
  console.error('   Revisa el archivo backend/.env\n');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('\n⚠️  HAY ADVERTENCIAS: Revisa las variables marcadas con ⚠️\n');
  process.exit(0);
} else {
  console.log('\n✅ Todas las variables requeridas están configuradas correctamente\n');
  process.exit(0);
}


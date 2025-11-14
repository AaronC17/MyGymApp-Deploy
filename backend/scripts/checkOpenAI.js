// Script para verificar la configuración de OpenAI
require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY;

console.log('\n🔍 Verificando configuración de OpenAI...\n');

if (!apiKey || apiKey.trim() === '') {
  console.error('❌ ERROR: OPENAI_API_KEY no está configurada');
  console.error('\n📝 Para solucionarlo:');
  console.error('   1. Abre el archivo backend/.env');
  console.error('   2. Agrega la siguiente línea:');
  console.error('      OPENAI_API_KEY=sk-xxxxxx-tu-api-key-aqui');
  console.error('   3. Reemplaza con tu propia API key de OpenAI');
  console.error('   4. Reinicia el servidor\n');
  process.exit(1);
}

if (!apiKey.startsWith('sk-')) {
  console.error('⚠️  ADVERTENCIA: La API key parece inválida');
  console.error('   La API key de OpenAI debe comenzar con "sk-"\n');
  process.exit(1);
}

if (apiKey.length < 50) {
  console.warn('⚠️  ADVERTENCIA: La API key parece muy corta');
  console.warn('   Las API keys de OpenAI suelen tener más de 50 caracteres\n');
}

console.log('✅ OpenAI API Key encontrada');
console.log(`   Longitud: ${apiKey.length} caracteres`);
console.log(`   Prefijo: ${apiKey.substring(0, 7)}...`);
console.log('\n✅ Configuración correcta. El AI Hub debería funcionar.\n');


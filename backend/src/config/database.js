const mongoose = require('mongoose');

// Check if already connected
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

const connectDB = async () => {
  // If already connected, return
  if (isConnected()) {
    console.log('✅ MongoDB ya está conectado');
    return;
  }

  try {
    // Try Cosmos DB first, then MongoDB URI, then default local
    const connectionString = 
      process.env.COSMOS_DB_CONNECTION_STRING || 
      process.env.MONGODB_URI || 
      process.env.MONGO_URI ||
      'mongodb://localhost:27017/energym-db';

    if (!connectionString || connectionString.trim() === '') {
      console.warn('⚠️  No se encontró string de conexión. Usando MongoDB local por defecto.');
      console.warn('   Configura COSMOS_DB_CONNECTION_STRING o MONGODB_URI en .env');
    }

    // Mongoose 7.x no longer needs these deprecated options
    // useNewUrlParser and useUnifiedTopology are now always true by default
    const conn = await mongoose.connect(connectionString);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    console.error(`⚠️  Asegúrate de que MongoDB esté corriendo o configura una conexión válida en .env`);
    console.error(`   Para desarrollo local: mongodb://localhost:27017/energym-db`);
    console.error(`   O usa MongoDB Atlas (gratis): https://www.mongodb.com/cloud/atlas`);
    console.error(`   Stack: ${error.stack}`);
    // No salir del proceso para permitir desarrollo sin DB (opcional)
    // process.exit(1);
  }
};

// Export connection check function
module.exports = connectDB;
module.exports.isConnected = isConnected;


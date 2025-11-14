require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const createAdmins = async () => {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await mongoose.connect(process.env.COSMOS_DB_CONNECTION_STRING);
    console.log('✅ Conectado a la base de datos\n');

    const admins = [
      {
        email: 'admin1@energym.com',
        password: '12341234',
        name: 'Administrador 1',
        role: 'admin',
      },
      {
        email: 'admin2@energym.com',
        password: '12341234',
        name: 'Administrador 2',
        role: 'admin',
      },
      {
        email: 'admin3@energym.com',
        password: '12341234',
        name: 'Administrador 3',
        role: 'admin',
      },
      {
        email: 'admin4@energym.com',
        password: '12341234',
        name: 'Administrador 4',
        role: 'admin',
      },
    ];

    console.log('👤 Creando administradores...\n');

    for (const adminData of admins) {
      try {
        // Verificar si ya existe
        const existingAdmin = await User.findOne({ email: adminData.email });
        
        if (existingAdmin) {
          console.log(`⚠️  ${adminData.email} ya existe, actualizando...`);
          existingAdmin.password = adminData.password; // Se hasheará automáticamente
          existingAdmin.name = adminData.name;
          existingAdmin.role = 'admin';
          await existingAdmin.save();
          console.log(`✅ ${adminData.email} actualizado`);
        } else {
          const admin = new User(adminData);
          await admin.save();
          console.log(`✅ ${adminData.email} creado`);
        }
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️  ${adminData.email} ya existe`);
        } else {
          console.error(`❌ Error creando ${adminData.email}:`, error.message);
        }
      }
    }

    console.log('\n✅ Proceso completado\n');
    console.log('📧 Credenciales de Administradores:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    admins.forEach((admin, index) => {
      console.log(`   Admin ${index + 1}: ${admin.email} / ${admin.password}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  IMPORTANTE: Cambia las contraseñas después del primer login\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmins();


const { BlobServiceClient } = require('@azure/storage-blob');
const { EmailClient } = require('@azure/communication-email');

// Azure Blob Storage - Solo inicializar si la connection string está configurada
let blobServiceClient = null;
if (process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.AZURE_STORAGE_CONNECTION_STRING.trim() !== '') {
  try {
    blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
    console.log('✅ Azure Blob Storage configurado');
  } catch (error) {
    console.warn('⚠️  Azure Blob Storage no configurado:', error.message);
  }
} else {
  console.warn('⚠️  Azure Blob Storage no configurado (connection string vacía)');
}

const getContainerClient = (containerName) => {
  if (!blobServiceClient) {
    throw new Error('Azure Blob Storage no está configurado. Configura AZURE_STORAGE_CONNECTION_STRING en .env');
  }
  return blobServiceClient.getContainerClient(containerName);
};

// Azure Communication Services - Solo inicializar si la connection string está configurada
let emailClient = null;
if (process.env.AZURE_COMMUNICATION_CONNECTION_STRING && process.env.AZURE_COMMUNICATION_CONNECTION_STRING.trim() !== '') {
  try {
    emailClient = new EmailClient(
      process.env.AZURE_COMMUNICATION_CONNECTION_STRING
    );
    console.log('✅ Azure Communication Services configurado');
  } catch (error) {
    console.warn('⚠️  Azure Communication Services no configurado:', error.message);
  }
} else {
  console.warn('⚠️  Azure Communication Services no configurado (connection string vacía)');
}

const sendEmail = async (to, subject, htmlContent) => {
  if (!emailClient) {
    console.warn('⚠️  Intento de enviar email pero Azure Communication Services no está configurado');
    console.log(`   Email que se habría enviado a ${to}: ${subject}`);
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const emailMessage = {
      senderAddress: process.env.AZURE_COMMUNICATION_EMAIL_FROM || 'DoNotReply@energym.com',
      content: {
        subject: subject,
        html: htmlContent,
      },
      recipients: {
        to: [{ address: to }],
      },
    };

    const poller = await emailClient.beginSend(emailMessage);
    const result = await poller.pollUntilDone();
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = {
  getContainerClient,
  sendEmail,
};


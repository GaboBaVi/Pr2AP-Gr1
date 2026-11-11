const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function enviarCorreo({ para, asunto, html }) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Credenciales de correo no configuradas. Simulando envío a:', para);
      return { exito: true, simulado: true };
    }
    const info = await transporter.sendMail({
      from: `"Club Valle Alto" <${process.env.EMAIL_USER}>`,
      to: para,
      subject: asunto,
      html: html
    });
    console.log(`✔ Correo enviado exitosamente a ${para} (MessageId: ${info.messageId})`);
    return { exito: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error enviando correo con Nodemailer:', error);
    return { exito: false, error };
  }
}

module.exports = {
  transporter,
  enviarCorreo
};

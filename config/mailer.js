const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  secure: false, // true para puerto 465, false para otros
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function enviarCorreo({ para, asunto, html }) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Credenciales de correo no configuradas. Simulando envio a:', para);
      return { exito: true, simulado: true };
    }
    const info = await transporter.sendMail({
      from: `"Club Valle Alto" <${process.env.EMAIL_USER}>`,
      to: para,
      subject: asunto,
      html: html
    });
    return { exito: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error enviando correo:', error);
    return { exito: false, error };
  }
}

module.exports = {
  transporter,
  enviarCorreo
};

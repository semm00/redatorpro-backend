import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.sendMail({
  from: `"RedatorPRO" <${process.env.EMAIL_USER}>`,
  to: process.env.EMAIL_USER,
  subject: "Teste SMTP Brevo",
  text: "Este é um teste de envio SMTP via Brevo."
}).then(info => {
  console.log("E-mail enviado:", info);
}).catch(err => {
  console.error("Erro ao enviar:", err);
});

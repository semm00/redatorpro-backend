import { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const userRouter = Router();
const prisma = new PrismaClient();
const upload = multer(); 

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Configuração do Nodemailer (ajuste para seu provedor)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // smtp-relay.brevo.com
  port: Number(process.env.EMAIL_PORT) || 587, // 587
  secure: false, // Brevo usa STARTTLS (não SSL direto)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function enviarEmailVerificacao(email, token) {
  const url = `${process.env.FRONTEND_URL || 'https://ifpi-picos.github.io/projeto-integrador-redatorpro'}/verificar-email.html?token=${token}`;
  await transporter.sendMail({
    from: `"RedatorPRO" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verifique seu e-mail - RedatorPRO",
    html: `<p>Olá! Clique no link abaixo para verificar seu e-mail:</p>
           <a href="${url}">${url}</a>`
  });
}

userRouter.post('/', upload.single('certificado'), async (req, res) => {
  console.log("Recebendo cadastro:", req.body, req.file);

  const { name, email, password, tipo, experiencia, escolaridade } = req.body;
  let certificadoUrl = null;

  if (tipo === 'corretor' && req.file) {
    try {
      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `${Date.now()}_${email}.${fileExt}`;
      console.log("Enviando certificado para Supabase:", fileName);

      const { error } = await supabase
        .storage
        .from('certificados')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (error) {
        console.error("Erro no upload do certificado:", error);
        return res.status(500).json({ error: "Erro ao enviar certificado para o storage." });
      }
      certificadoUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/certificados/${fileName}`;
      console.log("Certificado enviado. URL:", certificadoUrl);
    } catch (err) {
      console.error("Exceção ao enviar certificado:", err);
      return res.status(500).json({ error: "Erro inesperado ao enviar certificado." });
    }
  }

  if (!name || !email || !password || !tipo) {
    console.warn("Campos obrigatórios faltando:", { name, email, password, tipo });
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Senha criptografada, salvando usuário...");

    const userSaved = await prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword,
        tipo,
        experiencia: tipo === 'corretor' ? experiencia : null,
        escolaridade: tipo === 'corretor' ? escolaridade : null,
        certificado: tipo === 'corretor' ? certificadoUrl : null,
        aprovado: tipo === 'corretor' ? false : null,
        emailVerificado: false // novo campo
      }
    });

    // Gera token de verificação de e-mail (expira em 1 dia)
    const emailToken = jwt.sign(
      { id: userSaved.id, email: userSaved.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    await enviarEmailVerificacao(userSaved.email, emailToken);

    // Gera token JWT para o novo usuário (mas login só será permitido após verificação)
    const token = jwt.sign(
      { id: userSaved.id, name: userSaved.name, email: userSaved.email, tipo: userSaved.tipo },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ ...userSaved, token, mensagem: "Cadastro realizado. Verifique seu e-mail para ativar a conta." });
  } catch (error) {
    if (error.code === 'P2002' && error.meta && error.meta.target && error.meta.target.includes('email')) {
      return res.status(409).json({ error: "Este e-mail já está cadastrado. Faça login ou recupere sua senha." });
    }
    console.error("Erro ao salvar usuário:", error);
    res.status(500).json({ error: "Erro ao salvar usuário." });
  }
});

// Rota para verificar e-mail
userRouter.get('/verificar-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Token não fornecido." });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await prisma.users.update({
      where: { id: decoded.id },
      data: { emailVerificado: true }
    });
    // Redireciona para página de sucesso (ajuste a URL se quiser)
    return res.redirect(`${process.env.FRONTEND_URL || 'https://ifpi-picos.github.io/projeto-integrador-redatorpro'}/verificacao-sucesso.html`);
  } catch (err) {
    return res.status(400).json({ error: "Token inválido ou expirado." });
  }
});

userRouter.patch('/:id/aprovar', async (req, res) => {
  try {
    const user = await prisma.users.update({
      where: { id: Number(req.params.id) },
      data: { aprovado: true }
    });
    res.json({ message: "Corretor aprovado com sucesso!", user });
  } catch (error) {
    res.status(500).json({ error: "Erro ao aprovar corretor." });
  }
});

userRouter.get('/pendentes', async (req, res) => {
  try {
    const pendentes = await prisma.users.findMany({
      where: { tipo: 'corretor', aprovado: false }
    });
    res.json(pendentes);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar corretores pendentes." });
  }
});

userRouter.patch('/:id/reprovar', async (req, res) => {
  try {
    await prisma.users.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ message: "Corretor removido com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover corretor." });
  }
});

export default userRouter;
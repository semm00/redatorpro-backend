import { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer'; // Usar Nodemailer com Gmail

const userRouter = Router();
const prisma = new PrismaClient();
const upload = multer(); 

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Configuração do Nodemailer para Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

async function enviarEmailVerificacao(email, token) {
  const url = `${process.env.FRONTEND_URL || 'https://ifpi-picos.github.io/projeto-integrador-redatorpro'}/verificar-email.html?token=${token}`;
  const logoUrl = "https://ifpi-picos.github.io/projeto-integrador-redatorpro/imagens/logo%20nome.png"; // ajuste se necessário

  await transporter.sendMail({
    from: `"RedatorPRO" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Verifique seu e-mail - RedatorPRO",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:8px;">
        <div style="text-align:center;">
          <img src="${logoUrl}" alt="RedatorPRO" style="max-width:220px;margin-bottom:24px;">
        </div>
        <h2 style="color:#1a237e;text-align:center;">Bem-vindo ao RedatorPRO!</h2>
        <p style="font-size:1.1em;color:#333;text-align:center;">
          Olá! Para ativar sua conta, clique no botão abaixo para verificar seu e-mail:
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${url}" style="background:#1a237e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:1.1em;display:inline-block;">
            Verificar E-mail
          </a>
        </div>
        <p style="color:#555;text-align:center;">
          Se não conseguir clicar, copie e cole este link no navegador:<br>
          <a href="${url}" style="color:#1a237e;">${url}</a>
        </p>
        <hr style="margin:32px 0;">
        <p style="font-size:0.95em;color:#888;text-align:center;">
          Se você não criou uma conta, ignore este e-mail.<br>
          © RedatorPRO
        </p>
      </div>
    `
  });
}

userRouter.post('/', upload.single('certificado'), async (req, res) => {
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
    // Cria o usuário base (apenas campos do modelo User!)
    const userSaved = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        tipo,
        emailVerificado: false,
        fotoPerfil: null,
        descricao: null
      }
    });

    // Cria registro em Corretor ou Estudante
    if (tipo === 'corretor') {
      await prisma.corretor.create({
        data: {
          userId: userSaved.id,
          experiencia: experiencia || null,
          escolaridade: escolaridade || null,
          certificado: certificadoUrl || null,
          aprovado: false,
          rating: 0.0
        }
      });
    } else if (tipo === 'estudante') {
      await prisma.estudante.create({
        data: {
          userId: userSaved.id,
          instagram: null,
          interesses: []
        }
      });
    }

    // Gera token de verificação de e-mail (expira em 1 dia)
    const emailToken = jwt.sign(
      { id: userSaved.id, email: userSaved.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    try {
      await enviarEmailVerificacao(userSaved.email, emailToken);
      console.log("E-mail de verificação enviado para:", userSaved.email);
    } catch (emailErr) {
      console.error("Erro ao enviar e-mail de verificação:", emailErr);
      // Opcional: remover o usuário criado se o e-mail falhar
      // await prisma.users.delete({ where: { id: userSaved.id } });
      return res.status(500).json({ error: "Erro ao enviar e-mail de verificação. Tente novamente mais tarde." });
    }

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

  if (!token) {
    return res.status(400).json({ error: "Token não fornecido." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca o usuário antes de atualizar
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }
    // Só atualiza se ainda não estiver verificado
    if (!user.emailVerificado) {
      await prisma.user.update({
        where: { id: decoded.id },
        data: { emailVerificado: true }
      });
    }
    // Redireciona para página de sucesso (ajuste a URL se quiser)
    const redirectUrl = `${process.env.FRONTEND_URL || 'https://ifpi-picos.github.io/projeto-integrador-redatorpro'}/verificacao-sucesso.html`;
    return res.redirect(redirectUrl);
  } catch (err) {
    return res.status(400).json({ error: "Token inválido ou expirado." });
  }
});

userRouter.patch('/:id/aprovar', async (req, res) => {
  try {
    // Atualiza o campo aprovado na tabela Corretor, não mais em User
    const userId = Number(req.params.id);
    const corretor = await prisma.corretor.update({
      where: { userId },
      data: { aprovado: true }
    });
    res.json({ message: "Corretor aprovado com sucesso!", corretor });
  } catch (error) {
    res.status(500).json({ error: "Erro ao aprovar corretor." });
  }
});

userRouter.get('/pendentes', async (req, res) => {
  try {
    // Busca usuários do tipo corretor que ainda não foram aprovados
    const pendentes = await prisma.user.findMany({
      where: {
        tipo: 'corretor',
        corretor: {
          aprovado: false
        }
      },
      include: {
        corretor: true
      }
    });
    // Monta resposta incluindo campos do corretor
    const lista = pendentes.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      experiencia: u.corretor?.experiencia || '',
      escolaridade: u.corretor?.escolaridade || '',
      certificado: u.corretor?.certificado || '',
      aprovado: u.corretor?.aprovado || false
    }));
    res.json(lista);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar corretores pendentes." });
  }
});

userRouter.patch('/:id/reprovar', async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ message: "Corretor removido com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover corretor." });
  }
});

userRouter.post('/reenviar-verificacao', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "E-mail não fornecido." });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    if (user.emailVerificado) return res.status(400).json({ error: "E-mail já verificado." });

    const emailToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    await enviarEmailVerificacao(user.email, emailToken);
    res.json({ message: "E-mail de verificação reenviado." });
  } catch (err) {
    console.error("Erro ao reenviar verificação:", err);
    res.status(500).json({ error: "Erro ao reenviar verificação." });
  }
});

userRouter.get('/corretores-aprovados', async (req, res) => {
  try {
    // Busca usuários do tipo corretor que estão aprovados, incluindo dados do corretor
    const corretores = await prisma.user.findMany({
      where: {
        tipo: 'corretor',
        corretor: {
          aprovado: true
        }
      },
      include: {
        corretor: true
      }
    });
    // Monta resposta incluindo campos do corretor
    const lista = corretores.map(c => ({
      id: c.id,
      name: c.name,
      fotoPerfil: c.fotoPerfil,
      escolaridade: c.corretor?.escolaridade || '',
      experiencia: c.corretor?.experiencia || '',
      email: c.email,
      rating: typeof c.corretor?.rating === 'number' ? c.corretor.rating : 0.0,
      descricao: c.descricao || 'sem descrição'
    }));
    res.json(Array.isArray(lista) ? lista : []);
  } catch (err) {
    console.error('[GET /corretores-aprovados] Erro:', err);
    res.status(500).json({ error: 'Erro ao buscar corretores aprovados.', corretores: [] });
  }
});

export default userRouter;
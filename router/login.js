import express from 'express';
import bcrypt from 'bcrypt'; // Certifique-se de instalar com "npm install bcrypt"
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/', async (req, res) => {  // Rota para login
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios." });
  }

  try {
    // Use prisma.users.findUnique se o modelo estiver nomeado como "users" no Prisma schema
    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Senha incorreta." });
    }

    if (user.tipo === 'corretor' && user.aprovado === false) {
    return res.status(403).json({ error: "Seu cadastro de corretor ainda não foi aprovado." });
    }

    if (!user.emailVerificado) {
      return res.status(403).json({ error: "Você precisa verificar seu e-mail antes de fazer login." });
    }

    // Gera o token JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, tipo: user.tipo },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      user: { id: user.id, name: user.name, email: user.email, tipo: user.tipo },
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
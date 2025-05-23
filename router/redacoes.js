import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Busca redações do usuário logado
router.get('/', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }
  try {
    const redacoes = await prisma.essay.findMany({
      where: { authorId: req.session.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(redacoes);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar redações.' });
  }
});

export default router;
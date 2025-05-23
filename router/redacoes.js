import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Busca todas as redações (público)
router.get('/', async (req, res) => {
  try {
    const redacoes = await prisma.essay.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(redacoes);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar redações.' });
  }
});

export default router;
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Busca todas as redações (público)
router.get('/', async (req, res) => {
  console.log('[redacoes.js] Requisição GET /redacoes recebida');
  try {
    const redacoes = await prisma.essay.findMany({
      orderBy: { createdAt: 'desc' }
    });
    console.log('[redacoes.js] Redações encontradas:', redacoes.length);
    res.json(redacoes);
  } catch (err) {
    console.error('[redacoes.js] Erro ao buscar redações:', err);
    res.status(500).json({ error: 'Erro ao buscar redações.' });
  }
});

export default router;
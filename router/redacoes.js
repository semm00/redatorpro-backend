import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Busca apenas as redações do usuário autenticado
router.get('/', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }
  try {
    const redacoes = await prisma.essay.findMany({
      where: { authorId: req.session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tema: true,
        nota: true,
        texto: true,
        imagem: true,
        createdAt: true,
      },
    });

    // Adiciona lógica para gerar prévia e evitar "Redação enviada como imagem" para textos
    const redacoesComPrevia = redacoes.map((redacao) => ({
      ...redacao,
      preview: redacao.texto
        ? redacao.texto.slice(0, 100) + (redacao.texto.length > 100 ? '...' : '')
        : 'Redação enviada como imagem.',
    }));

    res.json(redacoesComPrevia);
  } catch (err) {
    console.error('[redacoes.js] Erro ao buscar redações:', err);
    res.status(500).json({ error: 'Erro ao buscar redações.' });
  }
});

export default router;
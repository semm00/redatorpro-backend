import express from 'express';
import { PrismaClient } from '@prisma/client';
import authMiddleware from '../middlewares/auth.js';

const prisma = new PrismaClient();
const router = express.Router();

// GET /correcao/essay/:id - dados da redação + autor
router.get('/essay/:id', authMiddleware, async (req, res) => {
  const essayId = parseInt(req.params.id, 10);
  if (!essayId) return res.status(400).json({ error: 'ID inválido.' });
  try {
    const essay = await prisma.essay.findUnique({
      where: { id: essayId },
      include: {
        author: { select: { id: true, name: true, email: true, fotoPerfil: true } }
      }
    });
    if (!essay) return res.status(404).json({ error: 'Redação não encontrada.' });
    return res.json({
      id: essay.id,
      tema: essay.tema,
      tipoCorrecao: essay.tipoCorrecao,
      createdAt: essay.createdAt,
      texto: essay.text,
      imagemUrl: essay.urlImage,
      autor: essay.author,
      notaTotal: essay.notaTotal
    });
  } catch (e) {
    console.error('[GET /correcao/essay/:id]', e);
    return res.status(500).json({ error: 'Erro ao carregar redação.' });
  }
});

// GET /correcao/:essayId - correção do corretor autenticado (se existir)
router.get('/:essayId', authMiddleware, async (req, res) => {
  const essayId = parseInt(req.params.essayId, 10);
  const corretorId = req.user?.id;
  if (!essayId || !corretorId) return res.status(400).json({ error: 'Parâmetros inválidos.' });
  try {
    const correction = await prisma.correction.findFirst({
      where: { essayId, corretorId },
      include: { annotations: true }
    });
    return res.json(correction || null);
  } catch (e) {
    console.error('[GET /correcao/:essayId]', e);
    return res.status(500).json({ error: 'Erro ao carregar correção.' });
  }
});

// POST /correcao/:essayId - cria/atualiza correção e sobrescreve anotações
router.post('/:essayId', authMiddleware, async (req, res) => {
  const essayId = parseInt(req.params.essayId, 10);
  const corretorId = req.user?.id;
  if (!essayId || !corretorId) return res.status(400).json({ error: 'Parâmetros inválidos.' });

  const { notas, notaTotal, comentariosGerais, annotations } = req.body || {};
  try {
    // encontra ou cria
    let correction = await prisma.correction.findFirst({ where: { essayId, corretorId } });
    if (!correction) {
      correction = await prisma.correction.create({
        data: {
          essayId, corretorId,
          notas: notas ?? null,
          notaTotal: typeof notaTotal === 'number' ? notaTotal : null,
          comentariosGerais: comentariosGerais ?? null
        }
      });
    } else {
      correction = await prisma.correction.update({
        where: { id: correction.id },
        data: {
          notas: notas ?? null,
          notaTotal: typeof notaTotal === 'number' ? notaTotal : null,
          comentariosGerais: comentariosGerais ?? null
        }
      });
      // Limpa anotações existentes para regravar
      await prisma.annotation.deleteMany({ where: { correctionId: correction.id } });
    }

    // Grava novas anotações (se houver)
    if (Array.isArray(annotations) && annotations.length) {
      await prisma.annotation.createMany({
        data: annotations.map(a => ({
          correctionId: correction.id,
          tipo: a.tipo || 'texto',
          rangeStart: a.rangeStart ?? null,
          rangeEnd: a.rangeEnd ?? null,
          snippet: a.snippet ?? null,
          rects: a.rects ?? null,
          color: a.color ?? '#ffea00',
          comment: a.comment ?? null
        }))
      });
    }

    const saved = await prisma.correction.findUnique({
      where: { id: correction.id },
      include: { annotations: true }
    });

    // opcionalmente, atualiza notaTotal na Essay para facilitar consultas
    if (typeof notaTotal === 'number') {
      await prisma.essay.update({
        where: { id: essayId },
        data: { notaTotal }
      });
    }

    return res.json(saved);
  } catch (e) {
    console.error('[POST /correcao/:essayId]', e);
    return res.status(500).json({ error: 'Erro ao salvar correção.' });
  }
});

export default router;

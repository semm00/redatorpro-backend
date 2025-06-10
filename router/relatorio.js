import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const usersWithEssays = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        tipo: true,
        createdAt: true,
        essays: {
          select: { id: true, createdAt: true }
        }
      }
    });

    // LOG para depuração
    console.log("usersWithEssays:", usersWithEssays.length);

    const now = new Date();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(now.getDate() - 28);

    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(now.getDate() - 15);

    // Busca todos os usuários criados nos últimos 15 dias
    const cadastros = await prisma.users.findMany({
      where: {
        createdAt: { gte: fifteenDaysAgo }
      },
      select: { createdAt: true }
    });

    console.log("cadastros últimos 15 dias:", cadastros.length);

    // Agrupa por dia (YYYY-MM-DD)
    const cadastrosPorDiaObj = {};
    cadastros.forEach(u => {
      const dia = u.createdAt.toISOString().slice(0, 10);
      cadastrosPorDiaObj[dia] = (cadastrosPorDiaObj[dia] || 0) + 1;
    });
    const cadastrosPorDia = Object.entries(cadastrosPorDiaObj).map(([data, total]) => ({
      data,
      total
    }));

    const usuarios = usersWithEssays.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      tipo: u.tipo,
      dataCadastro: u.createdAt,
      totalRedacoes: u.essays.length,
      redacoesSemanais: u.essays.filter(e => new Date(e.createdAt) > fourWeeksAgo).length
    }));

    res.json({
      usuarios,
      cadastrosPorDia
    });
  } catch (err) {
    console.error("Erro ao gerar relatório:", err);
    res.status(500).json({
      error: "Erro ao gerar relatório.",
      usuarios: [],
      cadastrosPorDia: []
    });
  }
});

export default router;

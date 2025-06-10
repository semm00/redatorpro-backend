import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    // ...mesmo código da rota /relatorio anterior...
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

    const now = new Date();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(now.getDate() - 28);

    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(now.getDate() - 15);

    const cadastrosPorDia = await prisma.users.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: {
        createdAt: { gte: fifteenDaysAgo }
      }
    });

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
      cadastrosPorDia: cadastrosPorDia.map(c => ({
        data: c.createdAt,
        total: c._count.id
      }))
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar relatório." });
  }
});

export default router;

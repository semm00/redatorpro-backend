import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// Busca apenas as redações do usuário autenticado
router.get("/", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Usuário não autenticado." });
  }
  try {
    const redacoes = await prisma.essay.findMany({
      where: {
        authorId: req.user.id,
        corrigidaPor: "ia",
        correcaoIa: {
          not: null,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(redacoes);
  } catch (err) {
    console.error("[redacoes.js] Erro ao buscar redações:", err);
    res.status(500).json({ error: "Erro ao buscar redações." });
  }
});

export default router;

import express from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = express.Router();
const prisma = new PrismaClient();

// Rota para receber redação, enviar para IA e salvar no banco
router.post('/', async (req, res) => {
  const { tipoCorrecao, tema, texto } = req.body;

  // Verifica se o usuário está autenticado via sessão
  if (!req.session.user) {
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }

  try {
    // Chamada para IA (exemplo HuggingFace)
    const iaResponse = await axios.post(
      'https://api-inference.huggingface.co/models/pszemraj/grammar-correction',
      { inputs: texto },
      { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` } }
    );
    const correcao = iaResponse.data[0]?.generated_text || "Sem resposta da IA";
    const nota = iaResponse.data[0]?.nota || null;

    // Salva no banco de dados
    const essay = await prisma.essay.create({
      data: {
        text: texto,
        urlImage: null,
        authorId: req.session.user.id, // Usa o ID do usuário logado na sessão
        corrigidaPor: "ia",
        correcaoIa: correcao,
        tipoCorrecao,
        tema,
        notaTotal: nota
      }
    });

    res.json({ correcao, nota, essay });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar a redação.' });
  }
});

export default router;
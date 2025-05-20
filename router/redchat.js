import express from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = express.Router();
const prisma = new PrismaClient();

// Rota para receber redação, enviar para IA e salvar no banco
router.post('/', async (req, res) => {
  const { tipoCorrecao, tema, texto, userId } = req.body;
  if (!texto || !userId) {
    return res.status(400).json({ error: 'Dados obrigatórios faltando.' });
  }

  try {
    // Exemplo de chamada para IA (substitua pela sua IA real)
    // Aqui está um exemplo usando HuggingFace, mas pode ser OpenAI ou outra
    const iaResponse = await axios.post(
      'https://api-inference.huggingface.co/models/pszemraj/grammar-correction',
      { inputs: texto },
      { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` } }
    );
    const correcao = iaResponse.data[0]?.generated_text || "Sem resposta da IA";

    // Salva no banco de dados
    const essay = await prisma.essay.create({
      data: {
        text: texto,
        urlImage: null,
        authorId: userId
      }
    });

    res.json({ correcao, essay });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar a redação.' });
  }
});

export default router;
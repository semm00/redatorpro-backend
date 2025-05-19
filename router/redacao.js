import express from 'express';
import axios from 'axios';

const router = express.Router();

router.post('/', async (req, res) => {
  const { texto } = req.body;

  if (!texto) {
    return res.status(400).json({ erro: 'Texto não fornecido' });
  }

  try {
    const resposta = await axios.post(
      'https://api-inference.huggingface.co/models/pszemraj/grammar-correction',
      { inputs: texto },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        },
      }
    );

    const resultado = resposta.data;

    res.json({ correcao: resultado[0]?.generated_text || "Sem resposta" });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ erro: 'Erro ao consultar a IA' });
  }
});

export default router;

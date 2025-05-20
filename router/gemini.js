import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', async (req, res) => {
  const { texto, tipoCorrecao } = req.body;

  if (!texto || !tipoCorrecao) {
    return res.status(400).json({ erro: 'Texto e tipo de correção são obrigatórios.' });
  }

  try {
    // Prompt personalizado conforme o tipo de correção
    const prompt = `
Corrija o texto abaixo conforme os critérios de "${tipoCorrecao}" (por exemplo: ENEM, Concurso ou Vestibular). 
Atribua uma nota de 0 a 1000 e faça comentários detalhados sobre os pontos positivos e negativos.

Texto do aluno:
${texto}
`;

    // Usa o modelo Gemini 1.5 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const correcao = response.text();

    res.json({ correcao });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao consultar a Gemini' });
  }
});

export default router;
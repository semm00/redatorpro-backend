import express from 'express';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', async (req, res) => {
  const { tipoCorrecao, tema, texto } = req.body;

  if (!req.session.user) {
    return res.status(401).json({ error: 'Usuário não autenticado.' });
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

    // (Opcional) Extrair a nota do texto da IA usando regex
    const notaMatch = correcao.match(/nota\s*[:=]?\s*(\d{2,4})/i);
    const nota = notaMatch ? Number(notaMatch[1]) : null;

    // Salva no banco de dados
    const essay = await prisma.essay.create({
      data: {
        text: texto,
        urlImage: null,
        authorId: req.session.user.id,
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
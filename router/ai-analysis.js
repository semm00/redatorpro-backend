import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function tryParseJSON(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    // tenta extrair o primeiro bloco JSON encontrado
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (err) {
        return null;
      }
    }
    return null;
  }
}

router.post("/", async (req, res) => {
  const { overview, competencies, distribution, recent, selectedType } =
    req.body || {};

  if (!overview) {
    return res.status(400).json({ erro: "overview é obrigatório" });
  }

  const typeLabel =
    selectedType === "enem"
      ? "ENEM"
      : selectedType === "vestibular"
        ? "Vestibular"
        : selectedType === "concursos"
          ? "Concurso"
          : "todos os tipos";

  const prompt = `Você é um assistente de ensino que combina resultados numéricos (médias e notas) com análise textual da redação para gerar um painel de "Análise da IA" em português.

A análise deve ser direcionada ao tipo de redação selecionado: ${typeLabel}.

Receba os seguintes dados (em JSON):

Receba os seguintes dados (em JSON):
- overview: objeto com mediaGeral, totalRedacoes, ultimaNota, iaCount, corretorCount
- competencies: lista de objetos { label, average }
- distribution: objeto com contagens por fonte
- recent: lista simplificada de redações recentes (tema, nota, fonte)
- selectedType: tipo de redação filtrado (all, enem, vestibular, concursos)

Sua tarefa:
1) Combine os números com a análise de competências para gerar um diagnóstico curto (2-3 frases).
2) Gere uma lista de 5 dicas acionáveis e detalhadas em linguagem natural, explicando o que o usuário deve praticar concretamente (ex.: exercícios, tempo de estudo, atividades por competência).
3) Para cada competência (use o campo "competencies"), ofereça 1 sugestão específica e um exemplo de exercício prático.
4) Proponha um mini-plano semanal (3 itens) para melhorar as competências mais fracas.
5) Retorne a saída no formato JSON estrito com as chaves: summary (string), tips (array de {title, text}), perCompetency (objeto por label -> { suggestion, exercise }), weeklyPlan (array de strings), and metadata { generatedAt }.

IMPORTANTE: Responda somente com o JSON válido (sem comentários, sem explicações extras). Use português correto.

Dados de entrada (apenas para referência):
overview: ${JSON.stringify(overview)}
competencies: ${JSON.stringify(competencies)}
distribution: ${JSON.stringify(distribution)}
recent sample: ${JSON.stringify((recent || []).slice(0, 3))}
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const parsed = tryParseJSON(text);

    if (parsed) {
      return res.json({ analysis: parsed });
    }

    // se não foi possível parsear, devolve o texto para o cliente tentar exibir
    return res.json({ analysis: null, fullText: text });
  } catch (err) {
    console.error("ai-analysis error:", err);
    res.status(500).json({ erro: "Erro ao consultar Gemini" });
  }
});

export default router;

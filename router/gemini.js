import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/", async (req, res) => {
  const { texto, tipoCorrecao, tema } = req.body;

  if (!texto || !tipoCorrecao) {
    return res
      .status(400)
      .json({ erro: "Texto e tipo de correção são obrigatórios." });
  }

  // Prompt personalizado conforme o tipo de correção
  let prompt = "";
  if (tipoCorrecao === "enem") {
    prompt = `
Texto para correção (Tema: ${tema}):
    ${texto}
Você é uma IA corretora de redações dissertativo-argumentativas no padrão do ENEM. Avalie o texto com base nas cinco competências da Matriz de Referência do ENEM, atribuindo notas conforme os critérios oficiais, utilizando as faixas de 0–40–80–120–160–200 pontos para cada competência, totalizando até 1000 pontos.

Para cada competência:

Atribua uma nota entre os níveis oficiais (0, 40, 80, 120, 160 ou 200).

Fundamente a nota com base nos descritores oficiais do INEP.

Análise Detalhada por Competência:

Competência 1 (Domínio da norma culta): Avalie a gramática, ortografia, pontuação e concordância.

Competência 2 (Compreensão do tema): Verifique se o texto aborda o tema proposto, evitando tangentes ou fuga total.

Competência 3 (Argumentação): Analise a organização de ideias, repertório sociocultural e coerência.

Competência 4 (Coesão): Avalie o uso de conectivos, progressão textual e estrutura lógica.

Competência 5 (Proposta de intervenção): Cheque se a solução é detalhada, respeita direitos humanos e está vinculada ao tema.

Pontos Fortes e Fracos:

Liste 3 méritos da redação (ex.: repertório relevante, boa articulação).

Liste 3 pontos a melhorar (ex.: generalizações, falta de detalhamento na proposta).

Notas Finais:

Atribua notas individuais por competência (0-200) e a nota total (0-1000).
IMPORTANTE: Ao final da resposta, escreva a nota total no formato: "Nota Final: [valor numérico]".

Sugestões de Melhoria:

Ofereça recomendações específicas para elevar a nota em cada competência.

Texto para correção:
${texto}
`;
  } else if (tipoCorrecao === "concursos") {
    prompt = `
Analise a redação abaixo usando critérios comuns a concursos que exigem dissertação argumentativa. Avalie conteúdo, organização e expressão, focando em argumentação sólida, coerência textual e uso adequado da norma culta.

Critérios de Correção Genéricos para Concursos:
1. CONTEÚDO
Avalie se o texto apresenta tese clara, argumentos relevantes e abordagem aprofundada do tema.
2. ESTRUTURA
Verifique se há introdução, desenvolvimento e conclusão bem definidos, com progressão temática e articulação entre parágrafos.
3. EXPRESSÃO
Analise gramática, pontuação, vocabulário e formalidade adequados ao gênero dissertativo.

Solicitações:
- Explique os principais pontos fortes e pontos de melhoria.
- Atribua notas parciais e calcule uma nota final de 0 a 100.
- Recomende mudanças práticas para aprimorar a redação.

IMPORTANTE: Ao final da resposta, escreva a nota total no formato: "Nota Final: [valor numérico]".

Texto para correção:
${texto}
`;
  } else if (tipoCorrecao === "fuvest" || tipoCorrecao === "vestibular") {
    prompt = `
Analise a redação abaixo com base em critérios genéricos de vestibulares que exigem dissertação argumentativa. Avalie desenvolvimento do tema, coerência dos argumentos, coesão textual e correção gramatical.

Critérios de Correção Genéricos para Vestibulares:
1. DESENVOLVIMENTO DO TEMA
Avalie se o texto atende ao tema e desenvolve as ideias de forma consistente.
2. COERÊNCIA E ARTICULAÇÃO
Verifique se os argumentos são organizados logicamente e se há transições claras entre partes do texto.
3. CORREÇÃO E VOCABULÁRIO
Analise norma culta, ortografia, pontuação e escolha adequada de vocabulário.

Solicitações:
- Indique 2 pontos fortes e 2 sugestões de melhoria.
- Explique os principais acertos e as maiores falhas.
- Recomende práticas concretas para evolução.

IMPORTANTE: Ao final da resposta, escreva a nota total no formato: "Nota Final: [valor numérico]".

Texto para correção:
${texto}
`;
    prompt = `
Avalie a redação abaixo conforme os critérios oficiais de VESTIBULAR, atribuindo nota de 10 a 50 pontos. Siga esta estrutura:

Critérios de Avaliação:

1. Desenvolvimento do tema e organização do texto dissertativo-argumentativo:
- Verifique se o texto é uma dissertação argumentativa e atende ao tema proposto.
- Avalie a capacidade de compreender a proposta, relacionar ideias e informações, pertinência das informações, progressão temática e capacidade crítico-argumentativa.
- Evite paráfrase da proposta e textos meramente expositivos.

2. Coerência dos argumentos e articulação das partes do texto:
- Avalie a coerência dos argumentos, organização das ideias, conclusões apropriadas, planejamento e construção significativa do texto.
- Verifique a coesão textual, uso adequado de conectivos e relações semânticas entre as partes do texto.

3. Correção gramatical e adequação vocabular:
- Avalie o domínio da norma-padrão da Língua Portuguesa, clareza na expressão das ideias, ortografia, morfologia, sintaxe, pontuação e vocabulário.
- Considere precisão, concisão e adequação do vocabulário ao tipo de texto.

Notas:
- Para cada um dos três critérios, atribua uma nota de 1 a 5.
- Multiplique as notas por 4, 3 e 3, respectivamente, para obter a nota ponderada.
- Some as notas ponderadas para obter a nota final (mínimo 10, máximo 50 pontos).
IMPORTANTE: Ao final da resposta, escreva a nota total no formato: "Nota Final: [valor numérico]".

Pontos Fortes e Pontos a Melhorar:
- Liste 2 pontos positivos e 2 aspectos que podem ser aprimorados.

Sugestões de Melhoria:
- Ofereça recomendações específicas para elevar a nota em cada critério.

Texto para correção:
${texto}
`;
  } else {
    prompt = `
Corrija o texto abaixo considerando critérios gerais de redação.
Atribua uma nota de 0 a 100 e faça comentários detalhados sobre os pontos positivos e negativos.
IMPORTANTE: Ao final da resposta, escreva a nota total no formato: "Nota Final: [valor numérico]".

Texto do aluno:
${texto}
`;
  }

  try {
    // Usa o modelo Gemini 3.5 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const correcao = response.text();

    res.json({ correcao });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao consultar a Gemini" });
  }
});

export default router;

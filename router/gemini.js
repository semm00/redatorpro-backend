import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', async (req, res) => {
  const { texto, tipoCorrecao } = req.body;

  if (!texto || !tipoCorrecao) {
    return res.status(400).json({ erro: 'Texto e tipo de correção são obrigatórios.' });
  }

  // Prompt personalizado conforme o tipo de correção
  let prompt = '';
  if (tipoCorrecao === 'enem') {
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
  } else if (tipoCorrecao === 'concursos') {
    prompt = `
Analise a redação abaixo conforme os critérios oficiais da FCC, que avalia dissertações argumentativas em três eixos principais: Conteúdo (40 pontos), Estrutura (30 pontos) e Expressão (30 pontos). A nota total é de 100 pontos.

Critérios de Correção Detalhados
1. CONTEÚDO (40 pontos)
Avalie:
- Perspectiva crítica: O texto apresenta uma abordagem original e bem fundamentada sobre o tema?
- Análise e senso crítico: Há argumentação lógica, com reflexão profunda (não apenas senso comum)?
- Consistência e coerência: Os argumentos são bem encadeados e sustentados com exemplos, dados ou referências?
Penalizações:
- Abordagem tangencial, superficial ou cópia de textos da prova.

2. ESTRUTURA (30 pontos)
Avalie:
- Gênero textual: É uma dissertação argumentativa (não narrativa ou descritiva)?
- Progressão textual: Os parágrafos seguem uma sequência lógica (introdução → desenvolvimento → conclusão)?
- Coesão: Uso adequado de conectivos e articulação entre frases/parágrafos.

3. EXPRESSÃO (30 pontos)
Avalie:
- Norma culta: Domínio da gramática (concordância, regência, pontuação, acentuação, etc.).
- Clareza e precisão: Vocabulário adequado e evitou repetições ou ambiguidades?
- Nível de linguagem: Formalidade compatível com o gênero dissertativo.

Solicitações Específicas:
Atribua notas parciais (0 a 40 para Conteúdo; 0 a 30 para Estrutura e Expressão).
Nota final: Soma das três partes (0 a 100).
IMPORTANTE: Ao final da resposta, escreva a nota total no formato: "Nota Final: [valor numérico]".

Destaque:
- 2 pontos fortes (ex.: argumentação sólida, coesão eficiente).
- 2 pontos fracos (ex.: generalizações, erros de regência).

Sugestões de melhoria: Recomendações específicas (ex.: aprofundar um argumento, revisar concordância).

Texto para correção:
${texto}
`;
  } else if (tipoCorrecao === 'fuvest') {
    prompt = `
Avalie a redação abaixo conforme os critérios oficiais da FUVEST, atribuindo nota de 10 a 50 pontos. Siga esta estrutura:

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
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

Aponte os erros específicos que justificam a redução da pontuação.

🧠 Competência I — Domínio da Norma Culta
Critérios de pontuação:

200: Sem desvios gramaticais ou com no máximo 1 desvio leve.

160: Poucos desvios leves, sem prejudicar a leitura.

120: Vários desvios que não comprometem totalmente o entendimento.

80: Muitos erros que dificultam a leitura.

40: Domínio precário da norma, com trechos ininteligíveis.

0: Texto anulado ou ilegível.

Ação esperada da IA: Identificar todos os erros gramaticais, ortográficos e de concordância. Para cada erro:

Apontar o trecho.

Explicar o erro.

Sugerir a forma correta.

📚 Competência II — Compreensão da Proposta e Aplicação de Conhecimentos
Critérios de pontuação:

200: Tema completamente abordado com repertório legitimado e produtivo.

160: Tema bem abordado, mas com uso pouco produtivo do repertório.

120: Tema abordado com alguma limitação ou 1 parte embrionária.

80: Abordagem incompleta ou 2 partes embrionárias.

40: Tangência ao tema, uso de cópia dos textos motivadores, traços de outro tipo textual.

0: Fuga ao tema ou tipo textual incorreto.

Ação esperada da IA: Analisar:

Se o tema foi integralmente compreendido e desenvolvido.

Se houve uso de repertório legítimo e pertinente.

Se a estrutura do texto tem introdução, desenvolvimento e conclusão proporcionais.

🧩 Competência III — Organização da Argumentação
Critérios de pontuação:

200: Seleção e desenvolvimento autoral de ideias com encadeamento excelente.

160: Organização consistente com argumentos relevantes.

120: Organização previsível com argumentação limitada.

80: Estrutura frágil e argumentos pouco desenvolvidos.

40: Contradições, cópia dos textos motivadores, argumentação confusa.

0: Texto anulado.

Ação esperada da IA: Avaliar:

Clareza da tese.

Qualidade e progressão dos argumentos.

Coerência lógica e originalidade.

🔗 Competência IV — Coesão Textual
Critérios de pontuação:

200: Repertório diversificado e adequado de elementos coesivos (intra e interparágrafo).

160: Poucas inadequações e boa variedade de conectivos.

120: Uso razoável, mas com repetições e conectivos simples.

80: Coesão precária com repetições ou lacunas.

40: Conectivos inertes, justaposição de frases ou texto em monobloco.

0: Texto desconexo ou ilegível.

Ação esperada da IA: Identificar:

Se há operadores argumentativos suficientes e bem usados.

Se há conexão entre parágrafos e dentro dos parágrafos.

Se há repetição excessiva ou ausência de ligação.

🛠️ Competência V — Proposta de Intervenção
Critérios de pontuação:

200: Proposta completa, com os 5 elementos (ação, agente, meio, efeito e detalhamento), viável e respeitando os direitos humanos.

160: 4 elementos presentes, com boa articulação.

120: 3 elementos ou proposta genérica.

80: 2 elementos ou intervenção vaga.

40: Proposta incompleta, sem detalhamento.

0: Ausência de proposta ou violação dos direitos humanos.

Ação esperada da IA: Identificar:

Se há proposta completa.

Se os 5 elementos estão presentes e articulados.

Se a proposta é viável e respeita direitos humanos.

🎯 Resultado Final:
Nota total (soma das 5 competências).
IMPORTANTE: Ao final da resposta, escreva a nota total no formato: "Nota Final: [valor numérico]".

Comentários explicativos e sugestões para cada competência.

Dica personalizada de melhoria ao final.
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
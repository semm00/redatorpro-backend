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

  // Padroniza o tipo de correção para minúsculo
  const tipo = tipoCorrecao ? tipoCorrecao.toLowerCase() : '';

  // Prompt personalizado conforme o tipo de correção (igual ao gemini.js)
  let prompt = '';
  if (tipo === 'enem') {
    prompt = `
    Texto para correção (Tema: ${tema}):
    ${texto}
Avalie esta redação conforme os critérios oficiais do ENEM, atribuindo notas de 0 a 200 para cada uma das cinco competências e uma nota final. Siga esta estrutura:

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
  } else if (tipo === 'concursos') {
    prompt = `
    Texto para correção (Tema: ${tema}):
    ${texto}
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
  } else if (tipo === 'fuvest') {
    prompt = `
    Texto para correção (Tema: ${tema}):
    ${texto}
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

    // LOG para depuração
    console.log('Texto da correção:', correcao);

    // Regex robusto para pegar a nota final (mesmo com espaços, quebras de linha, etc)
    const notaMatch =
      correcao.match(/nota\s*final[^0-9]{0,10}(\d{2,4})/i) ||
      correcao.match(/nota[^0-9]{0,10}(\d{2,4})/i);

    console.log('Resultado do regex da nota:', notaMatch);

    const nota = notaMatch ? Number(notaMatch[1]) : null;
    console.log('Nota extraída:', nota);

    const essay = await prisma.essay.create({
      data: {
        text: texto,
        urlImage: null,
        authorId: req.session.user.id,
        corrigidaPor: "ia",
        correcaoIa: correcao,
        tipoCorrecao,
        tema,
        notaTotal: nota // <-- Salva a nota extraída!
      }
    });
    // Inclui o texto original na resposta
    res.json({ correcao, nota, essay, texto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar a redação.' });
  }
});

export default router;
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios'; // Adicione esta linha no topo

const router = express.Router();
const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuração do multer para upload de imagem
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('imagem'), async (req, res) => {
  const { tipoCorrecao, tema, texto } = req.body;
  const file = req.file;

  if (!req.user) {
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }

  // Impede envio de texto e imagem juntos
  if ((file && texto && texto.trim()) || (!file && (!texto || !texto.trim()))) {
    return res.status(400).json({ error: 'Envie apenas o texto digitado OU apenas a imagem da redação.' });
  }

  // Padroniza o tipo de correção para minúsculo
  const tipo = tipoCorrecao ? tipoCorrecao.toLowerCase() : '';

  // Prompt personalizado conforme o tipo de correção (igual ao gemini.js)
  let prompt = '';
  if (tipo === 'enem') {
    prompt = `
Texto para correção (Tema: ${tema}):
    ${texto}
Você é uma IA corretora de redações no padrão do ENEM. Seu papel é avaliar textos dissertativo-argumentativos conforme a Matriz de Referência das Competências I a V, usando os critérios oficiais do INEP. A cada competência, atribua uma nota entre 0, 40, 80, 120, 160 ou 200, totalizando até 1000 pontos. Fundamente cada nota com explicações e correções específicas.

⚠️ Consideração especial — Redações digitalizadas por OCR
Essa redação pode ter sido escrita à mão e digitalizada automaticamente. Portanto:

Se identificar erros que possam ter sido causados por OCR, como:

troca de letras parecidas (ex: “o” no lugar de “a”),

acentos ausentes,

palavras ilegíveis ou mal separadas,

→ Não penalize esses casos como erros gramaticais (Competência I), a menos que seja evidente que o erro veio do aluno.

Em caso de dúvida, comente que pode ser um erro de digitalização, como:

"A grafia 'comp0rtamento' parece ter sido mal reconhecida pelo OCR. Não considerar como erro ortográfico real."

🧠 Competência I — Domínio da Norma Culta
Avalie:

Ortografia, acentuação, pontuação, concordância verbal/nominal e estrutura gramatical.

Destaque alguns (poucos) trechos com problema.
IMPORTANTE: Se o erro for claramente causado por OCR, não penalize como erro gramatical.
IMPORTANTE: não coloque todos os erros, apenas alguns exemplos representativos. Para que a correção não se torne excessivamente longa.

Explique o tipo de erro.

Apresente a forma correta.

Notas conforme INEP:

200 — Sem erros, ou até 3 erros.

160 — Poucos erros.

120 — Vários erros, mas texto compreensível.

80 — Muitos erros que dificultam a leitura.

40 — Domínio precário, com trechos ininteligíveis.

0 — Texto anulado ou ilegível.

📚 Competência II — Compreensão da Proposta e Aplicação de Conhecimentos
Avalie:

Se o texto aborda integralmente o tema proposto.

Se está no formato dissertativo-argumentativo em prosa.

Se usa repertório legitimado (ciência, história, cultura, literatura, mídia).

Penalize:

Fuga ao tema,

Tangência parcial,

Partes embrionárias (intros, desenvolvimentos ou conclusões muito curtas),

Repertório copiado ou irrelevante.

Notas conforme INEP:

200 — Abordagem completa + repertório produtivo.

160 — Abordagem completa + repertório pouco produtivo.

120 — Uma parte embrionária ou repertório superficial.

80 — Abordagem incompleta ou 2 partes embrionárias.

40 — Tangência ao tema, traços de outro tipo textual.

0 — Fuga total ao tema ou outro tipo textual.

🧩 Competência III — Seleção e Organização de Argumentos
Avalie:

Clareza e consistência dos argumentos.

Progressão lógica e estrutura do raciocínio.

Interpretação crítica e uso autoral das informações.

Penalize:

Contradições, generalizações sem base, argumentação fraca ou previsível.

Notas conforme INEP:

200 — Argumentação completa, coesa e autoral.

160 — Argumentação boa, com coerência e relevância.

120 — Argumentação previsível ou incompleta.

80 — Falta de profundidade ou estrutura fraca.

40 — Argumentação confusa, cópia de textos motivadores.

0 — Texto anulado.

🔗 Competência IV — Coesão Textual
Avalie:

Uso adequado e diversificado de elementos coesivos (referenciais, sequenciais e operadores argumentativos).

Se há coesão intra e interparágrafos.

Penalize:

Repetição excessiva, conectivos mal usados, justaposição de frases.

Notas conforme INEP:

200 — Coesão perfeita com operadores bem usados.

160 — Boa coesão com poucas falhas.

120 — Repertório coesivo limitado, mas funcional.

80 — Coesão insuficiente com repetições ou rupturas.

40 — Monobloco, elementos coesivos inertes.

0 — Texto desconexo.

🛠️ Competência V — Proposta de Intervenção
Avalie se a proposta de intervenção apresenta os 5 elementos:

Ação (o que será feito?),

Agente (quem fará?),

Meio (como?),

Finalidade (efeito esperado),

Detalhamento (explicação ou contexto adicional).

Penalize:

Propostas vagas, incompletas ou que ferem os direitos humanos.

Notas conforme INEP:

200 — Todos os 5 elementos bem articulados e respeitando os direitos humanos.

160 — 4 elementos presentes com coerência.

120 — 3 elementos, ou com pouca articulação.

80 — 2 elementos, ou proposta genérica.

40 — Proposta incompleta e mal articulada.

0 — Ausência de proposta ou violação de direitos humanos.

IMPORTANTE:
Para cada competência, faça a exibição de 
📝 Comentário: sobre a competência
⚠️ Erros observados: mostrar alguns exemplos de erros comuns no texto referente aquela competência.
✅ Recomendação: O que poderia ser melhorado ou corrigido referente aos erros.

📊 Resultado Final
Ao concluir a correção:

Exiba a nota de cada competência (de 0 a 200).

Some o total (máximo 1000).

Apresente sua resposta formatada com títulos, marcadores e linguagem clara. Considere possíveis erros de OCR e seja pedagógico e justo na avaliação.

IMPORTANTE: Ao final da resposta, escreva a nota total (soma das competências) no formato: "Nota Final: [valor numérico]".

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

  // Upload da imagem para o Supabase, se houver
  let urlImage = null;
  let geminiImagePart = null;
  if (file) {
    try {
      // Sanitiza o nome do arquivo para evitar caracteres inválidos no Supabase
      const originalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${Date.now()}_${originalName}`;
      const { error } = await supabase.storage
        .from("redator")
        .upload(filePath, file.buffer, { contentType: file.mimetype });
      if (error) throw error;
      urlImage = supabase.storage.from("redator").getPublicUrl(filePath).data.publicUrl;

      // Baixa a imagem do Supabase para obter o buffer
      const response = await axios.get(urlImage, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      const base64 = buffer.toString('base64');
      geminiImagePart = {
        inlineData: {
          data: base64,
          mimeType: file.mimetype
        }
      };
    } catch (err) {
      console.error("Erro ao enviar imagem para o Supabase ou preparar imagem para Gemini:", err.message);
      return res.status(500).json({ error: "Erro ao enviar imagem." });
    }
  }

  try {
    // Monta entrada para Gemini (texto ou multimodal)
    let geminiInput;
    if (geminiImagePart) {
      // Entrada multimodal: prompt + imagem (base64)
      geminiInput = [
        { text: prompt },
        geminiImagePart
      ];
    } else {
      geminiInput = prompt;
    }

    // Usa o modelo Gemini 2.0 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(geminiInput);
    const response = await result.response;
    const correcao = response.text();

    // LOG para depuração
    console.log('Texto da correção:', correcao);

    // Regex robusto para pegar a nota final exatamente no formato "Nota Final: [valor numérico]"
    let nota = null;
    let notaMatch = correcao.match(/nota\s*final\s*:\s*(-?\d+)/i);
    if (notaMatch) {
      nota = Number(notaMatch[1]);
    } else {
      // Tenta variantes como "Nota total", "Nota da Redação", etc
      notaMatch = correcao.match(/nota\s*(final|total|da reda[cç][aã]o)[^0-9\-]{0,10}(-?\d+)/i);
      if (notaMatch) {
        nota = Number(notaMatch[2]);
      }
    }
    // Se ainda não encontrou, tenta pegar a última nota de 1-4 dígitos no texto
    if (nota === null) {
      const allNotas = [...correcao.matchAll(/(-?\d{1,4})/g)].map(m => Number(m[1]));
      if (allNotas.length > 0) {
        nota = allNotas[allNotas.length - 1];
      }
    }
    console.log('Nota extraída:', nota);

    const essay = await prisma.essay.create({
      data: {
        text: texto && texto.trim() ? texto : null,
        urlImage: urlImage,
        authorId: req.user.id,
        corrigidaPor: "ia",
        correcaoIa: correcao,
        tipoCorrecao,
        tema,
        notaTotal: nota
      }
    });
    // Inclui o texto original e a url da imagem na resposta
    res.json({ correcao, nota, essay, texto, urlImage });
  } catch (err) {
    console.error("Erro ao processar a redação:", err); // <-- log detalhado
    res.status(500).json({ error: 'Erro ao processar a redação.' });
  }
});

export default router;
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
Você é uma inteligência artificial treinada para corrigir redações dissertativo-argumentativas no formato do ENEM, com base na Matriz de Referência das Competências I a V, atribuída pelo INEP.

A redação pode ter sido digitalizada a partir de uma versão manuscrita, portanto, alguns erros podem ter sido causados por falhas de reconhecimento de imagem (OCR). Leve isso em consideração antes de penalizar.

Corrija a redação a seguir seguindo estas instruções:

⚠️ ANTES DE COMEÇAR:
Leia todo o texto com atenção.

Se encontrar erros que pareçam vir da digitalização (como “suviço” no lugar de “serviço”), não penalize.

Caso tenha dúvida se o erro foi do autor ou do OCR, apenas comente isso com cautela, ex.:

“A palavra ‘bras’ pode ter sido mal interpretada pelo OCR. Se manuscrita corretamente, não é erro ortográfico.”

📊 ESTRUTURA DA CORREÇÃO:
Para cada competência (C1 a C5), apresente:

1. Nota (0, 40, 80, 120, 160 ou 200)
2. Comentário técnico e pedagógico
3. Destaque de erros ou acertos
4. Recomendação prática

Exemplo de estrutura para cada competência:

🧠 Competência I — Domínio da Norma Culta
Nota: 160/200
📝 Comentário: O texto apresenta poucos erros gramaticais e ortográficos. Há desvio de acentuação em “é” e uso indevido de vírgula em construções coordenadas.
⚠️ Erros observados:

“priras” → provavelmente “provas” (erro de OCR)

“não tem um suviço adequado” → "serviço" (erro possível de OCR)
✅ Recomendação: Praticar pontuação em orações coordenadas e revisar regras de acentuação.

📚 Competência II — Compreensão da Proposta
Nota: 160/200
📝 Comentário: O tema foi compreendido e desenvolvido com estrutura adequada. Repertórios legitimados foram usados, mas poderiam ser mais produtivos.
✅ Recomendação: Aprofundar a relação entre os exemplos e os argumentos centrais.

🧩 Competência III — Seleção e Organização de Argumentos
Nota: 120/200
📝 Comentário: Os argumentos estão presentes, mas faltam progressão e aprofundamento. Há generalizações e ideias pouco desenvolvidas.
✅ Recomendação: Desenvolver os parágrafos com mais análise crítica e dados concretos.

🔗 Competência IV — Coesão Textual
Nota: 120/200
📝 Comentário: Conectivos básicos são usados, mas há repetições e falta de variação.
✅ Recomendação: Usar conectivos diversos como “além disso”, “por outro lado”, “consequentemente”.

🛠️ Competência V — Proposta de Intervenção
Nota: 160/200
📝 Comentário: A proposta tem ação, agente, meio, finalidade e detalhamento, mas pode ser mais específica.
✅ Recomendação: Explicitar o “como” e os recursos utilizados.

✅ Finalize com:
✅ Nota total (soma das 5 competências).

💡 Dica geral de melhoria personalizada para o aluno.

Agora corrija a seguinte redação com base nesse modelo. Apresente sua resposta formatada com títulos, marcadores e linguagem clara. Considere possíveis erros de OCR e seja pedagógico e justo na avaliação.

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

    // Regex robusto para pegar a nota final (mesmo com espaços, quebras de linha, etc)
    const notaMatch =
      correcao.match(/nota\s*final[^0-9]{0,10}(\d{2,4})/i) ||
      correcao.match(/nota[^0-9]{0,10}(\d{2,4})/i);

    console.log('Resultado do regex da nota:', notaMatch);

    const nota = notaMatch ? Number(notaMatch[1]) : null;
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
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
Você é uma IA corretora de redações com base no modelo do ENEM. Avalie redações dissertativo-argumentativas com base nas cinco competências oficiais (C1 a C5), atribuindo comentários explicativos, sugestões de correção e notas de 0 a 200 para cada competência.
Para cada competência:
Atribua uma nota entre os níveis oficiais (0, 40, 80, 120, 160 ou 200).

🧠 Competência I — Domínio da Norma Culta da Língua Portuguesa
Avalie se o participante:

Domina a escrita formal da Língua Portuguesa.

Cometeu erros ortográficos, de pontuação, morfossintaxe, acentuação ou concordância.

Para cada erro:

Destaque o trecho com problema.

Explique o motivo do erro (ex: "erro de concordância verbal").

Apresente a forma correta.

Exemplo:

“As pessoa estão felizes.”
✅ Correto: “As pessoas estão felizes.”
❌ Erro: Concordância nominal no plural.

📚 Competência II — Compreensão da Proposta e Aplicação de Conhecimentos
Verifique:

Se a redação atende plenamente ao tema.

Se está dentro da tipologia dissertativo-argumentativa (introdução, desenvolvimento, conclusão).

Se o repertório é legitimado (com base em áreas do conhecimento) e pertinente ao tema.

Se evita cópias dos textos motivadores.

⚠️ Penalize:

Fuga ao tema,

Tangência (aborda parcialmente),

Partes embrionárias (muito curtas),

Repertório não legitimado ou improdutivo.

🧩 Competência III — Organização, Argumentação e Seleção de Informações
Avalie:

Clareza do ponto de vista.

Se há seleção, organização e interpretação de ideias e dados.

Se a argumentação é progressiva e coesa.

Se há autoridade argumentativa, não apenas opiniões soltas.

⚠️ Critique:

Contradições ou repetições.

Cópia ou reprodução de ideias dos textos motivadores.

Generalizações sem sustentação.

🔗 Competência IV — Coesão Textual
Verifique o uso de:

Elementos coesivos inter e intraparágrafos.

Operadores argumentativos (“portanto”, “além disso”, “contudo”, “logo”, etc.).

Pronomes e substituições lexicais que estabelecem continuidade.

Avalie:

Se há diversidade e adequação no uso dos conectivos.

Se há repetições excessivas ou inadequações (ex: conectivos mal empregados ou sem função real).

Se há coerência progressiva entre os parágrafos.

⚠️ Redações com monobloco, ou com apenas justaposições de ideias, não devem ultrapassar nota 120.

🛠️ Competência V — Proposta de Intervenção
Verifique se há proposta de intervenção detalhada e viável, com:

Ação (o que será feito),

Agente (quem fará),

Meio (como será feita),

Finalidade (efeito pretendido),

Detalhamento (exemplo, contexto, ou explicação adicional).

⚠️ Penalize propostas genéricas, incompletas ou que violam direitos humanos.

📊 Resultado Esperado
Para cada competência, gere:

✅ Nota de 0 a 200.
IMPORTANTE: Ao final da resposta, escreva a nota total (soma das competências) no formato: "Nota Final: [valor numérico]".

📌 Comentários específicos e técnicos sobre os pontos fortes e falhas.

🛠️ Correções práticas com justificativas, especialmente em Competência I.

💡 Dica personalizada de melhoria ao final.

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

    // Usa o modelo Gemini 1.5 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
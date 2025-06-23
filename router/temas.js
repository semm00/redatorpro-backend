import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Função utilitária para normalizar nomes de arquivos
function normalizarNomeArquivo(nome) {
  return nome
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9.\-_]/g, '_'); // Substitui caracteres especiais por _
}

// Rota para listar todos os temas (com textos motivadores)
router.get('/', async (req, res) => {
  try {
    const temas = await prisma.tema.findMany({
      include: { textosMotivadores: true },
    });
    res.json(temas);
  } catch (err) {
    console.error('[GET /temas] Erro ao buscar temas:', err);
    res.status(500).json({ error: 'Erro ao buscar temas.' });
  }
});

// Rota para adicionar um novo tema
router.post(
  '/',
  upload.fields([
    { name: 'capa', maxCount: 1 },
    { name: 'imagensMotivadoras', maxCount: 20 },
  ]),
  async (req, res) => {
    const { tipo, titulo, instrucoes, proposta, textosMotivadores } = req.body;
    const capaFile = req.files['capa'] ? req.files['capa'][0] : null;
    const imagensMotivadoras = req.files['imagensMotivadoras'] || [];

    // Novos campos para fontes
    // Para textos motivadores
    let fontesMotivadores = req.body.fontesMotivadores || [];
    // Para imagens motivadoras
    let fontesImagensMotivadoras = req.body.fontesImagensMotivadoras || [];

    // Garante que sejam arrays
    if (typeof fontesMotivadores === 'string') fontesMotivadores = [fontesMotivadores];
    if (typeof fontesImagensMotivadoras === 'string') fontesImagensMotivadoras = [fontesImagensMotivadoras];

    try {
      // Upload da imagem de capa para o Supabase
      let urlCapa = '';
      if (capaFile) {
        const nomeNormalizado = normalizarNomeArquivo(capaFile.originalname);
        const fileName = `capa_${Date.now()}_${nomeNormalizado}`;
        const { error } = await supabase.storage
          .from('temas')
          .upload(fileName, capaFile.buffer, { contentType: capaFile.mimetype });
        if (error) throw error;
        urlCapa = `${process.env.SUPABASE_URL}/storage/v1/object/public/temas/${fileName}`;
      }

      // Upload das imagens motivadoras para o Supabase
      const imagensUrls = [];
      for (const arquivo of imagensMotivadoras) {
        const nomeNormalizado = normalizarNomeArquivo(arquivo.originalname);
        const fileName = `${Date.now()}_${nomeNormalizado}`;
        const { error } = await supabase.storage
          .from('temas')
          .upload(fileName, arquivo.buffer, { contentType: arquivo.mimetype });
        if (error) throw error;
        const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/temas/${fileName}`;
        imagensUrls.push(url);
      }

      // Criação do tema no banco de dados
      const tema = await prisma.tema.create({
        data: {
          tipo,
          titulo,
          instrucoes,
          proposta,
          imagem: urlCapa,
        },
      });

      // Adiciona textos motivadores (texto)
      if (textosMotivadores) {
        const textos = Array.isArray(textosMotivadores)
          ? textosMotivadores
          : [textosMotivadores];
        for (let i = 0; i < textos.length; i++) {
          const texto = textos[i];
          const fonte = fontesMotivadores[i] || '';
          if (texto && texto.trim() !== '') {
            await prisma.textoMotivador.create({
              data: {
                tipo: 'texto',
                valor: texto,
                fonte: fonte, // novo campo
                temaId: tema.id,
              },
            });
          }
        }
      }

      // Adiciona textos motivadores (imagens)
      for (let i = 0; i < imagensUrls.length; i++) {
        const url = imagensUrls[i];
        const fonte = fontesImagensMotivadoras[i] || '';
        await prisma.textoMotivador.create({
          data: {
            tipo: 'imagem',
            valor: url,
            fonte: fonte, // novo campo
            temaId: tema.id,
          },
        });
      }

      const temaCompleto = await prisma.tema.findUnique({
        where: { id: tema.id },
        include: { textosMotivadores: true },
      });

      res.status(201).json(temaCompleto);
    } catch (err) {
      console.error('[POST /temas] Erro ao criar tema:', err);
      res.status(500).json({ error: 'Erro ao criar tema.' });
    }
  }
);

export default router;
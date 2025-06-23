import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

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
  upload.fields([{ name: 'imagensMotivadoras', maxCount: 10 }]),
  async (req, res) => {
    const { tipo, titulo, instrucoes, proposta, textosMotivadores } = req.body;
    const imagensMotivadoras = req.files['imagensMotivadoras'] || [];

    try {
      // Upload das imagens motivadoras para o Supabase
      const imagensUrls = [];
      for (const arquivo of imagensMotivadoras) {
        const fileName = `${Date.now()}_${arquivo.originalname}`;
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
          imagem: imagensUrls[0] || '', // Usa a primeira imagem como capa
        },
      });

      // Adiciona textos motivadores (texto)
      if (textosMotivadores) {
        // textosMotivadores pode ser string ou array
        const textos = Array.isArray(textosMotivadores)
          ? textosMotivadores
          : [textosMotivadores];
        for (const texto of textos) {
          if (texto && texto.trim() !== '') {
            await prisma.textoMotivador.create({
              data: {
                tipo: 'texto',
                valor: texto,
                temaId: tema.id,
              },
            });
          }
        }
      }

      // Adiciona textos motivadores (imagens)
      for (const url of imagensUrls) {
        await prisma.textoMotivador.create({
          data: {
            tipo: 'imagem',
            valor: url,
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
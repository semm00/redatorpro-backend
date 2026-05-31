import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const repertoriosBucket = process.env.SUPABASE_REPERTORIOS_BUCKET || 'repertorios';

const categories = new Set([
  'cinema',
  'livros',
  'conhecimentos-gerais',
  'dados-pesquisas',
  'citacoes',
]);

function normalizarNomeArquivo(nome) {
  return nome
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBodyArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(normalizeArray);
  try {
    return normalizeArray(JSON.parse(value));
  } catch {
    return normalizeArray(value);
  }
}

async function uploadCapa(file) {
  if (!file) return '';
  const nomeNormalizado = normalizarNomeArquivo(file.originalname);
  const fileName = `repertorio_${Date.now()}_${nomeNormalizado}`;
  const { error } = await supabase.storage
    .from(repertoriosBucket)
    .upload(fileName, file.buffer, { contentType: file.mimetype });
  if (error) throw error;
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${repertoriosBucket}/${fileName}`;
}

function repertorioData(body, coverUrl) {
  return {
    category: body.category,
    type: body.type || null,
    coverUrl: coverUrl || body.coverUrl || null,
    genre: body.genre || null,
    duration: body.duration || null,
    rating: body.rating || null,
    country: body.country || null,
    title: body.title,
    author: body.author || null,
    pages: body.pages || null,
    knowledgeArea: body.knowledgeArea || null,
    info: body.info || null,
    synopsis: body.synopsis || null,
    essayUse: body.essayUse,
    trailerUrl: body.trailerUrl || null,
    thematicAxes: parseBodyArray(body.thematicAxes),
    streamingLinks: parseBodyArray(body.streamingLinks),
    sourceLinks: parseBodyArray(body.sourceLinks),
    highlightedData: parseBodyArray(body.highlightedData),
  };
}

function validateRepertorio(body) {
  if (!categories.has(body.category)) return 'Categoria invalida.';
  if (!body.title || !body.essayUse) return 'Titulo e uso na redacao sao obrigatorios.';
  return '';
}

router.get('/', async (req, res) => {
  try {
    const where = req.query.category ? { category: String(req.query.category) } : {};
    const repertorios = await prisma.repertorio.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(repertorios);
  } catch (err) {
    console.error('[GET /repertorios] Erro ao buscar repertorios:', err);
    res.status(500).json({ error: 'Erro ao buscar repertorios.' });
  }
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID invalido.' });

  try {
    const repertorio = await prisma.repertorio.findUnique({ where: { id } });
    if (!repertorio) return res.status(404).json({ error: 'Repertorio nao encontrado.' });
    res.json(repertorio);
  } catch (err) {
    console.error('[GET /repertorios/:id] Erro ao buscar repertorio:', err);
    res.status(500).json({ error: 'Erro ao buscar repertorio.' });
  }
});

router.post('/', upload.single('capa'), async (req, res) => {
  const validation = validateRepertorio(req.body);
  if (validation) return res.status(400).json({ error: validation });

  try {
    const coverUrl = await uploadCapa(req.file);
    const repertorio = await prisma.repertorio.create({
      data: repertorioData(req.body, coverUrl),
    });
    res.status(201).json(repertorio);
  } catch (err) {
    console.error('[POST /repertorios] Erro ao criar repertorio:', err);
    res.status(500).json({ error: 'Erro ao criar repertorio.' });
  }
});

router.put('/:id', upload.single('capa'), async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID invalido.' });

  const validation = validateRepertorio(req.body);
  if (validation) return res.status(400).json({ error: validation });

  try {
    const coverUrl = await uploadCapa(req.file);
    const repertorio = await prisma.repertorio.update({
      where: { id },
      data: repertorioData(req.body, coverUrl),
    });
    res.json(repertorio);
  } catch (err) {
    console.error('[PUT /repertorios/:id] Erro ao atualizar repertorio:', err);
    res.status(500).json({ error: 'Erro ao atualizar repertorio.' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID invalido.' });

  try {
    await prisma.repertorio.delete({ where: { id } });
    res.json({ mensagem: 'Repertorio excluido com sucesso.' });
  } catch (err) {
    console.error('[DELETE /repertorios/:id] Erro ao excluir repertorio:', err);
    res.status(500).json({ error: 'Erro ao excluir repertorio.' });
  }
});

export default router;

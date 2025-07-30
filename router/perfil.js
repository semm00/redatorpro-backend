import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Buscar perfil do usuário autenticado
router.get('/', async (req, res) => {
  console.log('[GET /perfil] Authorization header:', req.headers.authorization);
  console.log('[GET /perfil] req.user:', req.user);
  if (!req.user) {
    console.log('[GET /perfil] Usuário não autenticado');
    return res.status(401).json({ error: 'Não autenticado' });
  }
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, tipo: true, instagram: true, fotoPerfil: true, descricao: true, interesses: true,
        escolaridade: true, experiencia: true // <-- ADICIONADO
      }
    });
    console.log('[GET /perfil] user:', user);
    const redacoes = await prisma.essay.findMany({
      where: { authorId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { notaTotal: true } // Corrigido: era nota, agora notaTotal
    });
    const totalRedacoes = redacoes.length;
    const ultimaNota = totalRedacoes > 0 ? redacoes[0].notaTotal : null;
    res.json({ ...user, totalRedacoes, ultimaNota });
  } catch (err) {
    console.error('[GET /perfil] Erro ao buscar perfil:', err);
    res.status(500).json({ error: 'Erro ao buscar perfil', details: err.message });
  }
});

// Atualizar perfil (nome, instagram, foto, descricao, interesses)
router.put('/', upload.single('fotoPerfil'), async (req, res) => {
  console.log('[PUT /perfil] req.user:', req.user);
  if (!req.user) {
    console.log('[PUT /perfil] Usuário não autenticado');
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const { name, instagram, descricao, escolaridade, experiencia } = req.body;
  let interesses = [];
  try {
    if (req.body.interesses) {
      interesses = JSON.parse(req.body.interesses);
      if (!Array.isArray(interesses)) interesses = [];
    }
  } catch {
    interesses = [];
  }
  // Validação backend
  let erros = [];
  if (!name || !name.trim()) erros.push('O nome não pode ser vazio.');
  if (instagram && !/^[a-zA-Z0-9._]+$/.test(instagram)) erros.push('O Instagram só pode conter letras, números, ponto ou underline.');
  if (descricao && descricao.length > 200) erros.push('A descrição deve ter no máximo 200 caracteres.');
  if (interesses.length > 8) erros.push('Máximo de 8 áreas de interesse.');
  if (interesses.some(tag => typeof tag !== 'string' || tag.length > 20)) erros.push('Cada área de interesse deve ter até 20 caracteres.');
  if (erros.length) return res.status(400).json({ error: erros.join(' ') });

  let fotoPerfilUrl = null;

  if (req.file) {
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${Date.now()}_${req.user.id}.${fileExt}`;
    console.log('[PUT /perfil] Upload de foto:', fileName);
    const { error } = await supabase
      .storage
      .from('perfil')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });
    if (error) {
      console.error('[PUT /perfil] Erro ao enviar foto:', error);
      return res.status(500).json({ error: 'Erro ao enviar foto', details: error.message });
    }
    fotoPerfilUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/perfil/${fileName}`;
  }

  try {
    const updated = await prisma.users.update({
      where: { id: req.user.id },
      data: {
        name,
        instagram,
        descricao,
        escolaridade, // <-- ADICIONADO
        experiencia,  // <-- ADICIONADO
        interesses,
        ...(fotoPerfilUrl && { fotoPerfil: fotoPerfilUrl })
      },
      select: { id: true, name: true, instagram: true, fotoPerfil: true, descricao: true, interesses: true, email: true, escolaridade: true, experiencia: true }
    });
    console.log('[PUT /perfil] Perfil atualizado:', updated);
    res.json(updated);
  } catch (err) {
    console.error('[PUT /perfil] Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro ao atualizar perfil', details: err.message });
  }
});

export default router;

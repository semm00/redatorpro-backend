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
        id: true, name: true, email: true, tipo: true, instagram: true, fotoPerfil: true, descricao: true
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

// Atualizar perfil (nome, instagram, foto, descricao)
router.put('/', upload.single('fotoPerfil'), async (req, res) => {
  console.log('[PUT /perfil] req.user:', req.user);
  if (!req.user) {
    console.log('[PUT /perfil] Usuário não autenticado');
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const { name, instagram, descricao } = req.body;
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
        ...(fotoPerfilUrl && { fotoPerfil: fotoPerfilUrl })
      },
      select: { id: true, name: true, instagram: true, fotoPerfil: true, descricao: true }
    });
    console.log('[PUT /perfil] Perfil atualizado:', updated);
    res.json(updated);
  } catch (err) {
    console.error('[PUT /perfil] Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro ao atualizar perfil', details: err.message });
  }
});

export default router;

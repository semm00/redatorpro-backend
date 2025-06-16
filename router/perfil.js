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
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, tipo: true, instagram: true, fotoPerfil: true, descricao: true
      }
    });
    const redacoes = await prisma.essay.findMany({
      where: { authorId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { nota: true }
    });
    const totalRedacoes = redacoes.length;
    const ultimaNota = totalRedacoes > 0 ? redacoes[0].nota : null;
    res.json({ ...user, totalRedacoes, ultimaNota });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// Atualizar perfil (nome, instagram, foto, descricao)
router.put('/', upload.single('fotoPerfil'), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
  const { name, instagram, descricao } = req.body;
  let fotoPerfilUrl = null;

  if (req.file) {
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${Date.now()}_${req.user.id}.${fileExt}`;
    const { error } = await supabase
      .storage
      .from('perfil')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });
    if (error) return res.status(500).json({ error: 'Erro ao enviar foto' });
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
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

export default router;

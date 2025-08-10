import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // até 5MB
});
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
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        estudante: true,
        corretor: true
      }
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    // Monta resposta incluindo campos de estudante/corretor se existirem
    const perfil = {
      id: user.id,
      name: user.name,
      email: user.email,
      tipo: user.tipo,
      fotoPerfil: user.fotoPerfil,
      descricao: user.descricao,
      // Estudante
      instagram: user.estudante?.instagram || null,
      interesses: user.estudante?.interesses || [],
      // Corretor
      escolaridade: user.corretor?.escolaridade || null,
      experiencia: user.corretor?.experiencia || null,
      rating: user.corretor?.rating ?? null,
      aprovado: user.corretor?.aprovado ?? null
    };
    console.log('[GET /perfil] user:', user);
    const redacoes = await prisma.essay.findMany({
      where: { authorId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { notaTotal: true } // Corrigido: era nota, agora notaTotal
    });
    const totalRedacoes = redacoes.length;
    const ultimaNota = totalRedacoes > 0 ? redacoes[0].notaTotal : null;
    res.json({ ...perfil, totalRedacoes, ultimaNota });
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
  let interesses = undefined;
  try {
    if (req.body.interesses !== undefined) {
      interesses = JSON.parse(req.body.interesses);
      if (!Array.isArray(interesses)) interesses = [];
    }
  } catch {
    interesses = [];
  }

  // Validação backend
  let erros = [];
  // Só exige name se NÃO for upload de foto
  if (!req.file && (!name || !name.trim())) erros.push('O nome não pode ser vazio.');
  // Se for apenas upload de foto, não valida outros campos
  if (!req.file) {
    if (instagram && !/^[a-zA-Z0-9._]+$/.test(instagram)) erros.push('O Instagram só pode conter letras, números, ponto ou underline.');
    if (descricao && descricao.length > 200) erros.push('A descrição deve ter no máximo 200 caracteres.');
    if (Array.isArray(interesses)) {
      if (interesses.length > 8) erros.push('Máximo de 8 áreas de interesse.');
      if (interesses.some(tag => typeof tag !== 'string' || tag.length > 20)) erros.push('Cada área de interesse deve ter até 20 caracteres.');
    }
  }
  if (erros.length) return res.status(400).json({ error: erros.join(' ') });

  let fotoPerfilUrl = null;
  if (req.file) {
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${Date.now()}_${req.user.id}.${fileExt}`;
    console.log('[PUT /perfil] Upload de foto:', fileName);
    const { data, error } = await supabase
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

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (descricao !== undefined) updateData.descricao = descricao;
  if (fotoPerfilUrl) updateData.fotoPerfil = fotoPerfilUrl;

  try {
    // Atualiza dados comuns
    await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    // Atualiza dados de estudante (se existir)
    const estudante = await prisma.estudante.findUnique({ where: { userId: req.user.id } });
    if (estudante) {
      const estudanteUpdate = {};
      if (instagram !== undefined) estudanteUpdate.instagram = instagram.trim() === "" ? null : instagram;
      if (interesses !== undefined) estudanteUpdate.interesses = interesses;
      if (Object.keys(estudanteUpdate).length > 0) {
        try {
          await prisma.estudante.update({
            where: { userId: req.user.id },
            data: estudanteUpdate
          });
        } catch (err) {
          console.error('[PUT /perfil] Erro ao atualizar estudante:', err);
        }
      }
    }

    // Atualiza dados de corretor (se existir)
    const corretor = await prisma.corretor.findUnique({ where: { userId: req.user.id } });
    if (corretor) {
      const corretorUpdate = {};
      if (escolaridade !== undefined) corretorUpdate.escolaridade = escolaridade;
      if (experiencia !== undefined) corretorUpdate.experiencia = experiencia;
      if (Object.keys(corretorUpdate).length > 0) {
        try {
          await prisma.corretor.update({
            where: { userId: req.user.id },
            data: corretorUpdate
          });
        } catch (err) {
          console.error('[PUT /perfil] Erro ao atualizar corretor:', err);
        }
      }
    }

    // Busca perfil atualizado para retornar sempre os dados completos
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        estudante: true,
        corretor: true
      }
    });

    const perfil = {
      id: user.id,
      name: user.name,
      email: user.email,
      tipo: user.tipo,
      fotoPerfil: user.fotoPerfil,
      descricao: user.descricao,
      instagram: user.estudante?.instagram || null,
      interesses: user.estudante?.interesses || [],
      escolaridade: user.corretor?.escolaridade || null,
      experiencia: user.corretor?.experiencia || null,
      rating: user.corretor?.rating ?? null,
      aprovado: user.corretor?.aprovado ?? null
    };

    res.json(perfil);
  } catch (err) {
    console.error('[PUT /perfil] Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro ao atualizar perfil', details: err.message });
  }
});

// Perfil do estudante
router.get('/estudante', async (req, res) => {
  console.log('[GET /perfil/estudante] Authorization header:', req.headers.authorization);
  console.log('[GET /perfil/estudante] req.user:', req.user);
  if (!req.user) {
    console.log('[GET /perfil/estudante] Usuário não autenticado');
    return res.status(401).json({ error: 'Não autenticado' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { estudante: true }
    });
    if (!user) {
      console.log('[GET /perfil/estudante] Usuário não encontrado no banco');
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    if (!user.estudante) {
      console.log('[GET /perfil/estudante] Estudante não encontrado para o usuário:', user.id);
      return res.status(404).json({ error: 'Estudante não encontrado.' });
    }
    const perfil = {
      id: user.id,
      name: user.name,
      email: user.email,
      tipo: user.tipo,
      fotoPerfil: user.fotoPerfil,
      descricao: user.descricao,
      instagram: user.estudante.instagram || null,
      interesses: user.estudante.interesses || [],
    };
    const redacoes = await prisma.essay.findMany({
      where: { authorId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { notaTotal: true }
    });
    const totalRedacoes = redacoes.length;
    const ultimaNota = totalRedacoes > 0 ? redacoes[0].notaTotal : null;
    console.log('[GET /perfil/estudante] Perfil montado:', perfil);
    res.json({ ...perfil, totalRedacoes, ultimaNota });
  } catch (err) {
    console.error('[GET /perfil/estudante] Erro ao buscar perfil:', err);
    res.status(500).json({ error: 'Erro ao buscar perfil de estudante', details: err.message });
  }
});

// Perfil do corretor
router.get('/corretor', async (req, res) => {
  console.log('[GET /perfil/corretor] Authorization header:', req.headers.authorization);
  console.log('[GET /perfil/corretor] req.user:', req.user);
  if (!req.user) {
    console.log('[GET /perfil/corretor] Usuário não autenticado');
    return res.status(401).json({ error: 'Não autenticado' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { corretor: true }
    });
    if (!user) {
      console.log('[GET /perfil/corretor] Usuário não encontrado no banco');
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    if (!user.corretor) {
      console.log('[GET /perfil/corretor] Corretor não encontrado para o usuário:', user.id);
      return res.status(404).json({ error: 'Corretor não encontrado.' });
    }
    const perfil = {
      id: user.id,
      name: user.name,
      email: user.email,
      tipo: user.tipo,
      fotoPerfil: user.fotoPerfil,
      descricao: user.descricao,
      escolaridade: user.corretor.escolaridade || null,
      experiencia: user.corretor.experiencia || null,
      certificado: user.corretor.certificado || null,
      aprovado: user.corretor.aprovado ?? null,
      rating: user.corretor.rating ?? null
    };
    console.log('[GET /perfil/corretor] Perfil montado:', perfil);
    res.json(perfil);
  } catch (err) {
    console.error('[GET /perfil/corretor] Erro ao buscar perfil:', err);
    res.status(500).json({ error: 'Erro ao buscar perfil de corretor', details: err.message });
  }
});

export default router;
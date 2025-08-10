import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import authMiddleware from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// GET /red-corretores - Lista todos os corretores aprovados
router.get('/', async (req, res) => {
	try {
		const corretores = await prisma.users.findMany({
			where: { tipo: 'corretor', aprovado: true },
			select: {
				id: true,
				name: true,
				fotoPerfil: true,
				escolaridade: true,
				experiencia: true,
				email: true,
				rating: true,
				descricao: true
			}
		});
		res.json(Array.isArray(corretores) ? corretores : []);
	} catch (err) {
		console.error('[GET /red-corretores] Erro:', err);
		res.status(500).json({ error: 'Erro ao buscar corretores.' });
	}
});

// POST /red-corretores - Envia redação para um corretor
router.post('/', authMiddleware, upload.single('imagem'), async (req, res) => {
	const { tipoCorrecao, tema, texto, corretorId } = req.body;
	const file = req.file;
	if (!req.user) {
		return res.status(401).json({ error: 'Usuário não autenticado.' });
	}
	if (!corretorId) {
		return res.status(400).json({ error: 'Corretor não informado.' });
	}
	if ((!texto || !texto.trim()) && !file) {
		return res.status(400).json({ error: 'Envie o texto digitado OU a imagem da redação.' });
	}
	if (texto && texto.trim() && file) {
		return res.status(400).json({ error: 'Envie apenas o texto digitado OU apenas a imagem da redação.' });
	}

	let urlImage = null;
	if (file) {
		try {
			const fileExt = file.originalname.split('.').pop();
			const fileName = `redacao_${Date.now()}_${req.user.id}.${fileExt}`;
			const { data, error } = await supabase
				.storage
				.from('redacoes')
				.upload(fileName, file.buffer, {
					contentType: file.mimetype,
					upsert: false
				});
			if (error) throw error;
			urlImage = `${process.env.SUPABASE_URL}/storage/v1/object/public/redacoes/${fileName}`;
		} catch (err) {
			console.error('[POST /red-corretores] Erro ao enviar imagem:', err);
			return res.status(500).json({ error: 'Erro ao enviar imagem.' });
		}
	}

	try {
		// Cria a redação no banco, associando ao corretor
		const essay = await prisma.essay.create({
			data: {
				text: texto && texto.trim() ? texto : null,
				urlImage: urlImage,
				authorId: req.user.id,
				corrigidaPor: 'corretor',
				tipoCorrecao,
				tema,
				// Adicione outros campos se necessário
			}
		});
		// Aqui você pode criar uma notificação para o corretor, se desejar
		res.json({ message: 'Redação enviada para o corretor!', essay });
	} catch (err) {
		console.error('[POST /red-corretores] Erro ao salvar redação:', err);
		res.status(500).json({ error: 'Erro ao salvar redação.' });
	}
});

// GET /red-corretores/pendentes?userId=XX - Lista redações enviadas para corretores (pendentes e corrigidas)
router.get('/pendentes', async (req, res) => {
	const userId = parseInt(req.query.userId, 10);
	if (!userId) {
		return res.status(400).json({ error: 'userId obrigatório' });
	}
	try {
		const essays = await prisma.essay.findMany({
			where: {
				authorId: userId,
				corrigidaPor: 'corretor'
			},
			orderBy: { createdAt: 'desc' },
			include: {
				// Busca o corretor se possível (se você tiver relação, ajuste aqui)
				// Exemplo: corretor: true
			}
		});
		const mapped = essays.map(e => ({
			id: e.id,
			tema: e.tema,
			texto: e.text,
			imagemUrl: e.urlImage,
			status: e.notaTotal !== undefined && e.notaTotal !== null ? 'Corrigida' : 'Pendente',
			notaTotal: e.notaTotal,
			createdAt: e.createdAt,
			// corretorNome: e.corretor ? e.corretor.name : undefined // descomente se houver relação
		}));
		res.json(mapped);
	} catch (err) {
		console.error('[GET /red-corretores/pendentes] Erro:', err);
		res.status(500).json({ error: 'Erro ao buscar redações pendentes.' });
	}
});

export default router;

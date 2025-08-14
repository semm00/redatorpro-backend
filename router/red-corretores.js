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
		const corretores = await prisma.user.findMany({
			where: {
				tipo: 'corretor',
				corretor: {
					aprovado: true
				}
			},
			include: {
				corretor: true
			}
		});
		const lista = corretores.map(c => ({
			id: c.id,
			name: c.name,
			fotoPerfil: c.fotoPerfil,
			escolaridade: c.corretor?.escolaridade || '',
			experiencia: c.corretor?.experiencia || '',
			email: c.email,
			rating: typeof c.corretor?.rating === 'number' ? c.corretor.rating : 0.0,
			descricao: c.descricao || 'sem descrição'
		}));
		res.json(Array.isArray(lista) ? lista : []);
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
	const corretorIdNum = parseInt(corretorId, 10);
	if (isNaN(corretorIdNum)) {
		return res.status(400).json({ error: 'corretorId inválido.' });
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
				.from('redator')
				.upload(fileName, file.buffer, {
					contentType: file.mimetype,
					upsert: false
				});
			if (error) throw error;
			urlImage = `${process.env.SUPABASE_URL}/storage/v1/object/public/redator/${fileName}`;
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
				corretorId: corretorIdNum // adicionado para permitir recuperar nome depois
			}
		});
		// Aqui você pode criar uma notificação para o corretor, se desejar
		res.json({ message: 'Redação enviada para o corretor!', essay });
	} catch (err) {
		console.error('[POST /red-corretores] Erro ao salvar redação:', err);
		res.status(500).json({ error: 'Erro ao salvar redação.' });
	}
});

// GET /red-corretores/solicitacoes - solicitações destinadas ao corretor autenticado
router.get('/solicitacoes', authMiddleware, async (req, res) => {
	try {
		// req.user.id é o ID do usuário (corretor) autenticado
		const corretorId = req.user?.id;
		if (!corretorId) {
			return res.status(401).json({ error: 'Não autenticado.' });
		}
		const essays = await prisma.essay.findMany({
			where: {
				corrigidaPor: 'corretor',
				corretorId: corretorId
			},
			orderBy: { createdAt: 'asc' }, // mais antiga -> mais recente
			include: {
				author: { select: { id: true, name: true, email: true, fotoPerfil: true } }
			}
		});
		const mapped = essays.map(e => ({
			id: e.id,
			createdAt: e.createdAt,
			tipoCorrecao: e.tipoCorrecao,
			tema: e.tema,
			texto: e.text,
			imagemUrl: e.urlImage,
			status: e.notaTotal !== undefined && e.notaTotal !== null ? 'Corrigida' : 'Pendente',
			aluno: e.author ? {
				id: e.author.id,
				name: e.author.name,
				email: e.author.email,
				fotoPerfil: e.author.fotoPerfil
			} : null
		}));
		return res.json(mapped);
	} catch (err) {
		console.error('[GET /red-corretores/solicitacoes] Erro:', err);
		return res.status(500).json({ error: 'Erro ao buscar solicitações.' });
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
				corretor: { select: { name: true } } // Supondo que existe relação corretorId -> users
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
			corretorNome: e.corretor ? e.corretor.name : undefined
		}));
		res.json(mapped);
	} catch (err) {
		console.error('[GET /red-corretores/pendentes] Erro:', err);
		res.status(500).json({ error: 'Erro ao buscar redações pendentes.' });
	}
});

export default router;
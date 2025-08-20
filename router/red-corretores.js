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

// NOVO: GET /red-corretores/solicitacoes - solicitações destinadas ao corretor autenticado
router.get('/solicitacoes', authMiddleware, async (req, res) => {
	try {
		const corretorId = req.user?.id;
		if (!corretorId) return res.status(401).json({ error: 'Não autenticado.' });

		const essays = await prisma.essay.findMany({
			where: { corrigidaPor: 'corretor', corretorId: corretorId },
			orderBy: { createdAt: 'asc' }, // mais antiga -> mais recente
			include: {
				author: { select: { id: true, name: true, fotoPerfil: true } }
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
			corretorNome: e.corretor ? e.corretor.name : undefined,
			// NOVO: status persistente de visualização pelo autor
			visualizada: e.correcaoVisualizada === true
		}));
		res.json(mapped);
	} catch (err) {
		console.error('[GET /red-corretores/pendentes] Erro:', err);
		res.status(500).json({ error: 'Erro ao buscar redações pendentes.' });
	}
});

// NOVO: PATCH /red-corretores/:id/visualizada - marca correção como visualizada pelo autor
router.patch('/:id/visualizada', authMiddleware, async (req, res) => {
	try {
		const essayId = parseInt(req.params.id, 10);
		if (!essayId) return res.status(400).json({ error: 'ID inválido.' });

		// Garante que o usuário logado é o autor da redação
		const essay = await prisma.essay.findUnique({ where: { id: essayId }, select: { authorId: true } });
		if (!essay) return res.status(404).json({ error: 'Redação não encontrada.' });
		if (essay.authorId !== req.user.id) return res.status(403).json({ error: 'Acesso negado.' });

		const updated = await prisma.essay.update({
			where: { id: essayId },
			data: { correcaoVisualizada: true, correcaoVisualizadaEm: new Date() },
			select: { id: true, correcaoVisualizada: true, correcaoVisualizadaEm: true }
		});
		return res.json(updated);
	} catch (err) {
		console.error('[PATCH /red-corretores/:id/visualizada] Erro:', err);
		return res.status(500).json({ error: 'Erro ao marcar como visualizada.' });
	}
});

// NOVO: GET /red-corretores/:id/avaliacao - retorna a avaliação do usuário logado para essa REDAÇÃO (essayId)
router.get('/:id/avaliacao', authMiddleware, async (req, res) => {
	try {
		const essayId = parseInt(req.params.id, 10);
		const autorUserId = req.user?.id;
		if (!essayId || !autorUserId) return res.status(400).json({ error: 'Parâmetros inválidos.' });

		// garante que a redação existe
		const essay = await prisma.essay.findUnique({ where: { id: essayId } });
		if (!essay) return res.status(404).json({ error: 'Redação não encontrada.' });

		const rating = await prisma.rating.findUnique({
			where: { essayId_autorUserId: { essayId, autorUserId } }
		});
		return res.json(rating ? { value: rating.value, createdAt: rating.createdAt } : null);
	} catch (err) {
		console.error('[GET /red-corretores/:id/avaliacao] Erro:', err);
		return res.status(500).json({ error: 'Erro ao buscar avaliação.' });
	}
});

// ALTERADO: POST /red-corretores/:id/avaliar - avalia a correção da redação (id = essayId)
// só o autor da redação pode avaliar, e apenas uma vez (persistente)
router.post('/:id/avaliar', authMiddleware, async (req, res) => {
	try {
		const essayId = parseInt(req.params.id, 10);
		const autorUserId = req.user?.id;
		const r = Number(req.body.rating ?? req.body.ratingValue ?? null);
		if (!essayId || !autorUserId || !Number.isFinite(r) || r < 0.5 || r > 5) {
			return res.status(400).json({ error: 'Rating inválido. Deve ser entre 0.5 e 5.' });
		}

		// encontra redação e verifica autor
		const essay = await prisma.essay.findUnique({ where: { id: essayId } });
		if (!essay) return res.status(404).json({ error: 'Redação não encontrada.' });
		if (essay.authorId !== autorUserId) return res.status(403).json({ error: 'Só o autor pode avaliar esta correção.' });

		// verifica se já existe correção para esta redação (opcional)
		const existingCorrection = await prisma.correction.findFirst({ where: { essayId } });
		if (!existingCorrection) return res.status(400).json({ error: 'Correção ainda não disponível para avaliação.' });

		// verifica se autor já avaliou esta redação
		const existingRating = await prisma.rating.findUnique({
			where: { essayId_autorUserId: { essayId, autorUserId } }
		});
		if (existingRating) {
			return res.status(200).json({ message: 'Você já avaliou esta correção.', value: existingRating.value, createdAt: existingRating.createdAt });
		}

		// cria nova avaliação e atualiza counters do corretor associado à correção (se houver)
		const result = await prisma.$transaction(async (tx) => {
			const created = await tx.rating.create({
				data: { essayId, autorUserId, value: r }
			});

			// atualiza estatísticas do corretor que fez a correção (se disponível)
			const corretorUserId = existingCorrection.corretorId || essay.corretorId || null;
			let updatedCorretor = null;
			if (corretorUserId) {
				const corretor = await tx.corretor.findUnique({ where: { userId: corretorUserId } });
				if (corretor) {
					const novoCount = (corretor.ratingCount || 0) + 1;
					const novoSum = (corretor.ratingSum || 0) + r;
					const novoAvg = novoSum / novoCount;
					updatedCorretor = await tx.corretor.update({
						where: { userId: corretorUserId },
						data: { ratingCount: novoCount, ratingSum: novoSum, rating: novoAvg }
					});
				}
			}

			return { created, updatedCorretor };
		});

		return res.json({
			essayId,
			yourRating: result.created.value,
			rating: result.updatedCorretor ? result.updatedCorretor.rating : null,
			ratingCount: result.updatedCorretor ? result.updatedCorretor.ratingCount : null,
			ratingSum: result.updatedCorretor ? result.updatedCorretor.ratingSum : null
		});
	} catch (err) {
		console.error('[POST /red-corretores/:id/avaliar] Erro:', err);
		return res.status(500).json({ error: 'Erro ao salvar avaliação.' });
	}
});

export default router;
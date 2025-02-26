import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Erro: Variáveis de ambiente não configuradas corretamente!");
    process.exit(1); // Para a execução se as variáveis não forem encontradas
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Rota de upload
router.post("/", upload.single("file"), async (req, res) => {
    try {
        // 1️⃣ Verifica se o usuário está autenticado
        if (!req.session.user) {
            return res.status(401).json({ error: "Usuário não autenticado." });
        }

        // 2️⃣ Obtém o ID do usuário autenticado da sessão
        const userId = req.session.user.id;

        const file = req.file;
        const text = req.body.text;
        let publicUrl = null;

        // 3️⃣ Se houver imagem, faz upload no Supabase
        if (file) {
            const filePath = `${Date.now()}_${file.originalname}`;
            const { data, error } = await supabase.storage
                .from("redator")
                .upload(filePath, file.buffer, { contentType: file.mimetype });

            if (error) throw error;

            publicUrl = supabase.storage.from("redator").getPublicUrl(filePath).data.publicUrl;
        }

        // 4️⃣ Salva a redação no banco de dados com o ID correto do usuário logado
        const essay = await prisma.essay.create({
            data: {
                text: text || null,
                urlImage: publicUrl || null,
                authorId: userId // 🔥 Agora salva o ID correto
            }
        });

        res.json({ url: publicUrl, essay });
    } catch (error) {
        console.error("Erro no upload:", error.message);
        res.status(500).json({ error: "Erro ao enviar arquivo." });
    }
});

// Rota para obter todas as redações
router.get("/", async (req, res) => {
    try {
        const essays = await prisma.essay.findMany({
            include: {
                author: true
            }
        });
        res.json(essays);
    } catch (error) {
        console.error("Erro ao obter redações:", error.message);
        res.status(500).json({ error: "Erro ao obter redações." });
    }
});

export default router;

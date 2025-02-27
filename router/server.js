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
        const file = req.file;
        const text = req.body.text;
        let publicUrl = null;

        console.log("Iniciando upload...");
        console.log("Arquivo recebido:", file);
        console.log("Texto recebido:", text);

        if (file) {
            const filePath = `${Date.now()}_${file.originalname}`;
            const { data, error } = await supabase.storage
                .from("redator")
                .upload(filePath, file.buffer, { contentType: file.mimetype });

            console.log("Resultado do upload:", { data, error });

            if (error) throw error;

            publicUrl = supabase.storage.from("redator").getPublicUrl(filePath).data.publicUrl;
            console.log("URL pública do arquivo:", publicUrl);
        }

        // Verifica se o usuário está autenticado
        if (!req.session.user) {
            console.log("Usuário não autenticado.");
            return res.status(401).json({ error: "Usuário não autenticado." });
        }

        console.log("Usuário autenticado:", req.session.user);

        // Salvar a redação no banco de dados
        const essay = await prisma.essay.create({
            data: {
                text: text || null,
                urlImage: publicUrl || null,
                authorId: req.session.user.id // Usa o ID do usuário logado na sessão
            }
        });

        console.log("Redação salva no banco de dados:", essay);

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
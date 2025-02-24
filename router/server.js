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
        if (!file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

        const filePath = `${Date.now()}_${file.originalname}`;

        const { data, error } = await supabase.storage
            .from("redator")
            .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (error) throw error;

        const publicUrl = supabase.storage.from("redator").getPublicUrl(filePath).data.publicUrl;
        res.json({ url: publicUrl });
    } catch (error) {
        console.error("Erro no upload:", error.message);
        res.status(500).json({ error: "Erro ao enviar arquivo." });
    }
});

export default router;

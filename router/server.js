require("dotenv").config(); // Carrega variáveis de ambiente do .env

const express = require("express");
const cors = require("cors"); // Adicionado para evitar problemas com CORS
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors()); // Permite requisições do frontend
app.use(express.json()); // Garante que o Express consiga lidar com JSON

const upload = multer({ storage: multer.memoryStorage() });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Erro: Variáveis de ambiente não configuradas corretamente!");
    process.exit(1); // Para a execução se as variáveis não forem encontradas
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.post("/server", upload.single("file"), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

        const filePath = `${Date.now()}_${file.originalname}.`;

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

import express from "express";
import { PDFDocument, rgb } from "pdf-lib";

const router = express.Router();

router.post("/gerar-pdf", async (req, res) => {
    console.log("📩 Recebendo requisição para gerar PDF...");
    console.log("📜 Texto recebido:", req.body.texto); // Log para verificar o texto recebido

    try {
        const { texto } = req.body;

        if (!texto || texto.trim() === "") {
            console.log("❌ Erro: Texto vazio!");
            return res.status(400).json({ error: "Texto não pode estar vazio" });
        }

        console.log("✅ Texto válido, iniciando geração do PDF...");
        
        // Criar um novo documento PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]);

        page.drawText(texto, {
            x: 50,
            y: 750,
            size: 12,
            color: rgb(0, 0, 0),
            maxWidth: 500,
        });

        console.log("✅ PDF criado com sucesso!");

        // Salvar o PDF em buffer
        const pdfBytes = await pdfDoc.save();

        // Configurar resposta para download
        res.setHeader("Content-Disposition", 'attachment; filename="redacao.pdf"');
        res.setHeader("Content-Type", "application/pdf");
        res.send(Buffer.from(pdfBytes));

        console.log("📤 PDF enviado para o cliente!");
    } catch (error) {
        console.error("❌ Erro ao gerar PDF:", error);
        res.status(500).json({ error: "Erro ao gerar PDF" });
    }
});

export default router;

import express from "express";
import { PDFDocument, rgb } from "pdf-lib";

const router = express.Router();

router.post("/gerar-pdf", async (req, res) => {
    try {
        const { texto } = req.body;

        if (!texto || texto.trim() === "") {
            return res.status(400).json({ error: "Texto não pode estar vazio" });
        }

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

        // Salvar o PDF em buffer
        const pdfBytes = await pdfDoc.save();

        // Configurar resposta para download
        res.setHeader("Content-Disposition", 'attachment; filename="redacao.pdf"');
        res.setHeader("Content-Type", "application/pdf");
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        res.status(500).json({ error: "Erro ao gerar PDF" });
    }
});

export default router;

import express from "express";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

const router = express.Router();

router.post("/gerar-pdf", async (req, res) => {
    console.log("📩 Recebendo requisição para gerar PDF...");
    console.log("📜 Texto recebido:", req.body.texto);

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

        // Definir cores e fonte
        const azulClaro = rgb(173, 216, 230);
        const preto = rgb(0, 0, 0);
        const fonte = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Definir fundo azul claro
        page.drawRectangle({
            x: 0,
            y: 0,
            width: 600,
            height: 800,
            color: azulClaro,
        });

        // Desenhar 30 linhas horizontais (espaçadas de 25px)
        let linhaInicialY = 750;
        for (let i = 0; i < 30; i++) {
            page.drawLine({
                start: { x: 50, y: linhaInicialY },
                end: { x: 550, y: linhaInicialY },
                thickness: 1,
                color: preto,
            });
            linhaInicialY -= 25;
        }

        // Adicionar o texto dentro das linhas
        const linhasTexto = texto.split("\n").slice(0, 30); // Garantir que não ultrapasse 30 linhas
        let textoY = 755;

        linhasTexto.forEach((linha, index) => {
            page.drawText(linha, {
                x: 55,
                y: textoY - index * 25,
                size: 12,
                font: fonte,
                color: preto,
            });
        });

        // Adicionar a logo na parte inferior
        const logoPath = path.join(__dirname, "../public/logo.png"); // Caminho da logo
        if (fs.existsSync(logoPath)) {
            const logoBytes = fs.readFileSync(logoPath);
            const logoImage = await pdfDoc.embedPng(logoBytes);
            page.drawImage(logoImage, {
                x: 200,
                y: 20,
                width: 200,
                height: 50,
            });
        } else {
            console.log("⚠️ Logo não encontrada, pulando inserção.");
        }

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


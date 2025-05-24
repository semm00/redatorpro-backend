import express from "express";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Função para quebrar texto para preencher cada linha ao máximo
function quebrarTextoPorLinha(texto, fonte, tamanhoFonte, maxWidth, maxLinhas) {
    const palavras = texto.split(/\s+/);
    let linhas = [];
    let linhaAtual = "";

    for (const palavra of palavras) {
        let testeLinha = linhaAtual.length === 0 ? palavra : linhaAtual + " " + palavra;
        const largura = fonte.widthOfTextAtSize(testeLinha, tamanhoFonte);
        if (largura > maxWidth && linhaAtual !== "") {
            linhas.push(linhaAtual);
            linhaAtual = palavra;
        } else {
            linhaAtual = testeLinha;
        }
    }
    if (linhaAtual) linhas.push(linhaAtual);

    // Junta linhas se houver menos que o máximo
    if (linhas.length > maxLinhas) {
        linhas = linhas.slice(0, maxLinhas);
    }
    return linhas;
}

router.post("/gerar-pdf", async (req, res) => {
    try {
        const { texto } = req.body;
        if (!texto || texto.trim() === "") {
            return res.status(400).json({ error: "Texto não pode estar vazio" });
        }

        // Parâmetros visuais
        const pageWidth = 600;
        const pageHeight = 900;
        const marginX = 50;
        const marginTop = 60;
        const marginBottom = 90;
        const totalLinhas = 30;
        const lineSpacing = (pageHeight - marginTop - marginBottom) / (totalLinhas - 1);
        const maxWidth = pageWidth - 2 * marginX;

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Fundo com gradiente fake (azul claro para branco)
        const fundoAzulClaro = rgb(0.82, 0.92, 0.98);
        page.drawRectangle({
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight,
            color: fundoAzulClaro,
        });

        // Borda decorativa
        page.drawRectangle({
            x: 10,
            y: 10,
            width: pageWidth - 20,
            height: pageHeight - 20,
            borderColor: rgb(0.13, 0.45, 0.82),
            borderWidth: 2,
            color: rgb(1, 1, 1, 0) // transparente
        });

        // Fonte
        const fonte = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const preto = rgb(0, 0, 0);
        const tamanhoFonte = 13;

        // Título
        page.drawText("Folha de Redação", {
            x: marginX,
            y: pageHeight - 35,
            size: 18,
            font: fonte,
            color: rgb(0.13, 0.45, 0.82),
        });

        // Linhas horizontais
        for (let i = 0; i < totalLinhas; i++) {
            const y = pageHeight - marginTop - i * lineSpacing;
            page.drawLine({
                start: { x: marginX, y },
                end: { x: pageWidth - marginX, y },
                thickness: 1,
                color: rgb(0.8, 0.85, 0.9),
            });
        }

        // Processa o texto para preencher cada linha ao máximo
        let linhasTexto = quebrarTextoPorLinha(texto, fonte, tamanhoFonte, maxWidth, totalLinhas);

        // Desenha o texto, preenchendo cada linha ao máximo
        for (let i = 0; i < linhasTexto.length && i < totalLinhas; i++) {
            const y = pageHeight - marginTop - i * lineSpacing + 5;
            page.drawText(linhasTexto[i], {
                x: marginX + 3,
                y,
                size: tamanhoFonte,
                font: fonte,
                color: preto,
                maxWidth: maxWidth - 6,
            });
        }

        // Logo centralizada e com proporção melhor
        const logoPath = path.join(__dirname, "public/logo nome.png");
        if (fs.existsSync(logoPath)) {
            const logoBytes = fs.readFileSync(logoPath);
            const logoImage = await pdfDoc.embedPng(logoBytes);
            // Mantém proporção da logo
            const logoWidth = 180;
            const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
            page.drawImage(logoImage, {
                x: (pageWidth - logoWidth) / 2,
                y: 20,
                width: logoWidth,
                height: logoHeight,
            });
        }

        // Rodapé decorativo
        page.drawLine({
            start: { x: marginX, y: 15 },
            end: { x: pageWidth - marginX, y: 15 },
            thickness: 1.5,
            color: rgb(0.13, 0.45, 0.82),
        });

        const pdfBytes = await pdfDoc.save();
        res.setHeader("Content-Disposition", 'attachment; filename="redacao.pdf"');
        res.setHeader("Content-Type", "application/pdf");
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        res.status(500).json({ error: "Erro ao gerar PDF" });
    }
});

export default router;
// This code snippet creates a PDF file from text input and sends it back as a download response. It uses the pdf-lib library to generate the PDF document and express to handle the HTTP requests.
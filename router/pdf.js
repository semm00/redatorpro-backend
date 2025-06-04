import express from "express";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Função para quebrar linhas do textarea para caber no PDF
function linhasTextareaParaPDF(texto, maxLinhas, fonte, tamanhoFonte, maxWidth) {
    // Remove todos os \r (carriage return) para evitar erro de encoding do pdf-lib
    texto = texto.replace(/\r/g, "");
    // LOG para debug
    console.log("[linhasTextareaParaPDF] texto limpo:", JSON.stringify(texto));
    const linhasOriginais = texto.split('\n');
    let linhasFinal = [];
    for (let linha of linhasOriginais) {
        let working = linha.replace(/ /g, '\u00A0');
        while (working.length > 0) {
            let corte = working.length;
            let sub = working;
            if (!sub) break;
            while (sub && fonte.widthOfTextAtSize(sub, tamanhoFonte) > maxWidth && corte > 0) {
                corte--;
                sub = working.slice(0, corte);
            }
            if (!sub || corte === 0) break;
            linhasFinal.push(sub);
            working = working.slice(corte);
        }
        if (linha === "") linhasFinal.push("");
    }
    if (linhasFinal.length > maxLinhas) {
        linhasFinal = linhasFinal.slice(0, maxLinhas);
    }
    while (linhasFinal.length < maxLinhas) {
        linhasFinal.push("");
    }
    // LOG para debug
    console.log("[linhasTextareaParaPDF] linhasFinal:", linhasFinal);
    return linhasFinal;
}

router.post("/gerar-pdf", async (req, res) => {
    try {
        const { texto } = req.body;
        console.log("[/gerar-pdf] texto recebido:", JSON.stringify(texto));
        if (!texto || typeof texto !== "string" || texto.trim() === "") {
            console.log("[/gerar-pdf] Texto inválido:", texto);
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
        const tamanhoFonte = 14;

        // Título centralizado
        const titulo = "Folha de Redação";
        const larguraTitulo = fonte.widthOfTextAtSize(titulo, 18);
        page.drawText(titulo, {
            x: (pageWidth - larguraTitulo) / 2,
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

        // Gera as linhas do PDF quebrando conforme largura
        let linhasTexto;
        try {
            linhasTexto = linhasTextareaParaPDF(texto, totalLinhas, fonte, tamanhoFonte, maxWidth);
        } catch (err) {
            console.error("[/gerar-pdf] Erro ao processar linhas do texto:", err);
            return res.status(500).json({ error: "Erro ao processar linhas do texto", detalhe: err.message });
        }

        // LOG para debug
        console.log("[/gerar-pdf] linhasTexto final:", linhasTexto);

        // Desenha o texto, linha a linha, igual ao textarea (com quebra)
        for (let i = 0; i < linhasTexto.length && i < totalLinhas; i++) {
            const y = pageHeight - marginTop - i * lineSpacing + 2;
            const linha = linhasTexto[i].length === 0 ? "\u00A0" : linhasTexto[i];
            page.drawText(linha, {
                x: marginX + 3,
                y,
                size: tamanhoFonte,
                font: fonte,
                color: preto,
            });
        }

        // Logo centralizada e com proporção melhor
        const logoPath = path.join(__dirname, "public/logo nome.png");
        if (fs.existsSync(logoPath)) {
            try {
                const logoBytes = fs.readFileSync(logoPath);
                const logoImage = await pdfDoc.embedPng(logoBytes);
                const logoWidth = 180;
                const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
                page.drawImage(logoImage, {
                    x: (pageWidth - logoWidth) / 2,
                    y: 20,
                    width: logoWidth,
                    height: logoHeight,
                });
            } catch (logoErr) {
                console.error("[/gerar-pdf] Erro ao inserir logo:", logoErr);
            }
        } else {
            console.log("[/gerar-pdf] Logo não encontrada em:", logoPath);
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
        console.log("[/gerar-pdf] PDF gerado e enviado com sucesso!");
    } catch (error) {
        console.error("[/gerar-pdf] Erro geral:", error);
        res.status(500).json({ error: "Erro ao gerar PDF", detalhe: error.message });
    }
});

export default router;
// This code snippet creates a PDF file from text input and sends it back as a download response. It uses the pdf-lib library to generate the PDF document and express to handle the HTTP requests.
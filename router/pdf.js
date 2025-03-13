import express from "express";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Neste exemplo usaremos cada quebra de linha (\n) para definir uma linha
router.post("/gerar-pdf", async (req, res) => {
    console.log("📩 Recebendo requisição para gerar PDF...");

    try {
        const { texto } = req.body;
        console.log("📜 Texto recebido:", texto ? `"${texto.substring(0, 50)}..."` : "NÃO RECEBIDO");

        if (!texto || texto.trim() === "") {
            console.log("❌ Erro: Texto vazio!");
            return res.status(400).json({ error: "Texto não pode estar vazio" });
        }

        console.log("✅ Texto válido, iniciando geração do PDF...");

        // Vamos aumentar a altura da página para acomodar o texto e reservar área para a logo
        const pageWidth = 600;
        const pageHeight = 900;  
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        console.log("📄 Página do PDF criada!");

        // Definir cores e fonte
        const fundoAzulClaro = rgb(173 / 255, 216 / 255, 230 / 255);
        const preto = rgb(0, 0, 0);
        const fonte = await pdfDoc.embedFont(StandardFonts.Helvetica);
        console.log("✍️ Fonte Helvetica embutida!");

        // Desenhar fundo
        page.drawRectangle({
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight,
            color: fundoAzulClaro,
        });
        console.log("🎨 Fundo desenhado!");

        // Configurar valores para as linhas e texto
        const totalLinhas = 30;                // Número total de linhas (igual ao front-end)
        const lineSpacing = 30;                // Espaçamento de 30px para cada linha (mesmo que no CSS)
        const topMargin = 50;                  // Margem no topo para não desenhar colado à borda
        const bottomMargin = 80;               // Reserva para a logo
        const usableHeight = pageHeight - topMargin - bottomMargin;
        
        // Se o usableHeight dividido pelo lineSpacing for menor que o total de linhas, podemos ajustar
        const maxLinhas = Math.floor(usableHeight / lineSpacing);
        console.log(`📝 Espaço disponível permite desenhar até ${maxLinhas} linhas.`);

        // Desenhar linhas horizontais (começando no topo do usable area)
        for (let i = 0; i < maxLinhas; i++) {
            const y = pageHeight - topMargin - i * lineSpacing;
            page.drawLine({
                start: { x: 50, y },
                end: { x: pageWidth - 50, y },
                thickness: 1,
                color: preto,
            });
        }
        console.log("📏 Linhas horizontais desenhadas!");

        // Dividir o texto do textarea conforme as quebras de linha feitas pelo usuário
        const linhasTexto = texto.split("\n").slice(0, maxLinhas);
        // Posicionar o texto no mesmo local que as linhas (ajustando um pouco para centralizar na linha)
        linhasTexto.forEach((linha, index) => {
            // A posição y é definida para que a linha 1 do textarea fique na linha 1 do PDF
            const y = pageHeight - topMargin - index * lineSpacing - (lineSpacing - 12) / 2; // Ajuste (12 = tamanho da fonte)
            page.drawText(linha, {
                x: 55,
                y,
                size: 12,
                font: fonte,
                color: preto,
            });
        });
        console.log("📝 Texto adicionado ao PDF!");

        // Adicionar a logo na parte inferior, garantindo que ela não sobreponha as linhas
        const logoPath = path.join(__dirname, "public/logo nome.png");
        console.log("📂 Verificando logo em:", logoPath);
        if (fs.existsSync(logoPath)) {
            console.log("✅ Logo encontrada! Embutindo no PDF...");
            const logoBytes = fs.readFileSync(logoPath);
            const logoImage = await pdfDoc.embedPng(logoBytes);
            // Posicionar a logo dentro do bottomMargin
            page.drawImage(logoImage, {
                x: 175,
                y: 10,      // Certifique-se que esse Y está dentro da área reservada (10 + logo height <= bottomMargin)
                width: 250,
                height: 60,
            });
            console.log("🖼️ Logo adicionada ao PDF!");
        } else {
            console.log("⚠️ Logo não encontrada, pulando inserção.");
        }

        console.log("✅ PDF criado com sucesso!");
        // Salvar e enviar o PDF
        const pdfBytes = await pdfDoc.save();
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
// This code snippet creates a PDF file from text input and sends it back as a download response. It uses the pdf-lib library to generate the PDF document and express to handle the HTTP requests.
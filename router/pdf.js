import express from "express";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

function quebrarTexto(texto, fonte, tamanhoFonte, maxWidth) {
    const linhas = [];
    let palavras = texto.split(" ");
    let linhaAtual = "";

    for (let palavra of palavras) {
        let linhaTeste = linhaAtual.length === 0 ? palavra : `${linhaAtual} ${palavra}`;
        let larguraTexto = fonte.widthOfTextAtSize(linhaTeste, tamanhoFonte);

        if (larguraTexto < maxWidth) {
            linhaAtual = linhaTeste;
        } else {
            linhas.push(linhaAtual);
            linhaAtual = palavra;
        }
    }

    if (linhaAtual) {
        linhas.push(linhaAtual);
    }

    return linhas;
}

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

        // Criar um novo documento PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]);

        console.log("📄 Página do PDF criada!");

        // Definir cores e fonte
        const azulClaro = rgb(173 / 255, 216 / 255, 230 / 255);
        const preto = rgb(0, 0, 0);
        const fonte = await pdfDoc.embedFont(StandardFonts.Helvetica);
        console.log("✍️ Fonte Helvetica embutida!");

        // Definir fundo azul claro
        page.drawRectangle({
            x: 0,
            y: 0,
            width: 600,
            height: 800,
            color: azulClaro,
        });

        console.log("🎨 Fundo azul desenhado!");

        // Desenhar linhas horizontais
        let linhaInicialY = 770;
        for (let i = 0; i < 30; i++) {
            page.drawLine({
                start: { x: 50, y: linhaInicialY },
                end: { x: 550, y: linhaInicialY },
                thickness: 1,
                color: preto,
            });
            linhaInicialY -= 30; // Ajuste o espaçamento entre as linhas conforme necessário
        }
        console.log("📏 Linhas horizontais desenhadas!");

        // Adicionar o texto dentro das linhas
        const tamanhoFonte = 12;
        const maxWidth = 500;
        const linhasTexto = quebrarTexto(texto, fonte, tamanhoFonte, maxWidth).slice(0, 30);
        let textoY = 755;

        linhasTexto.forEach((linha, index) => {
            page.drawText(linha, {
                x: 55,
                y: textoY - index * 30, // Ajuste o espaçamento entre as linhas conforme necessário
                size: tamanhoFonte,
                font: fonte,
                color: preto,
            });
        });

        console.log("📝 Texto adicionado ao PDF!");

        // Adicionar a logo na parte inferior
        const logoPath = path.join(__dirname, "public/logo nome.png"); 
        console.log("📂 Verificando logo em:", logoPath);

        if (fs.existsSync(logoPath)) {
            console.log("✅ Logo encontrada! Embutindo no PDF...");
            const logoBytes = fs.readFileSync(logoPath);
            const logoImage = await pdfDoc.embedPng(logoBytes);

            page.drawImage(logoImage, {
                x: 175,
                y: 10,
                width: 250,
                height: 60,
            });

            console.log("🖼️ Logo adicionada ao PDF!");
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
import express from "express";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Função para quebrar uma longa string considerando o tamanho do texto
function quebrarTextoAutomatico(texto, fonte, tamanhoFonte, maxWidth) {
    const palavras = texto.split(" ");
    let linhas = [];
    let linhaAtual = "";

    for (const palavra of palavras) {
        const testeLinha = linhaAtual.length === 0 ? palavra : linhaAtual + " " + palavra;
        const largura = fonte.widthOfTextAtSize(testeLinha, tamanhoFonte);
        if (largura > maxWidth && linhaAtual !== "") {
            linhas.push(linhaAtual);
            linhaAtual = palavra;
        } else {
            linhaAtual = testeLinha;
        }
    }
    if (linhaAtual) linhas.push(linhaAtual);
    return linhas;
}

// Função para tratar todo o texto: para cada parágrafo (separado por "\n"), aplica a quebra automática
function processarTexto(texto, fonte, tamanhoFonte, maxWidth) {
    let linhasFinais = [];
    const paragrafos = texto.split("\n");
    paragrafos.forEach(paragrafo => {
        // Se o parágrafo for vazio, insere uma linha vazia
        if (paragrafo.trim() === "") {
            linhasFinais.push("");
        } else {
            const linhas = quebrarTextoAutomatico(paragrafo, fonte, tamanhoFonte, maxWidth);
            linhasFinais.push(...linhas);
        }
    });
    return linhasFinais;
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

        // Ajuste o tamanho da página para acomodar o conteúdo e a logo
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

        // Configurar valores para as linhas
        const totalLinhas = 30;                // Número de linhas desejado
        const topMargin = 40;                  // Reduzimos a margem superior para posicionar o texto mais acima
        const bottomMargin = 70;               // Reserva para a logo
        // Calcular o espaçamento dinamicamente para ter 30 linhas
        const lineSpacing = (pageHeight - topMargin - bottomMargin) / totalLinhas;
        const maxWidth = pageWidth - 100;      // Espaço para o texto (ajuste conforme necessário)


        // Calcular quantas linhas cabem na área útil
        const usableHeight = pageHeight - topMargin - bottomMargin;
        const maxLinhas = Math.floor(usableHeight / lineSpacing);
        console.log(`📝 Espaço disponível permite até ${maxLinhas} linhas.`);

        // Desenhar linhas horizontais (do topo da área utilizável)
        for (let i = 0; i < totalLinhas; i++) {
            const y = pageHeight - topMargin - i * lineSpacing;
            page.drawLine({
                start: { x: 50, y },
                end: { x: pageWidth - 50, y },
                thickness: 1,
                color: preto,
            });
        }
        console.log("📏 Linhas horizontais desenhadas!");
        
        // Processar o texto (já existente) e limitar a 30 linhas:
        const tamanhoFonte = 8;
        let linhasTexto = processarTexto(texto, fonte, tamanhoFonte, maxWidth);
        linhasTexto = linhasTexto.slice(0, totalLinhas);
        
        // Desenhar o texto em cada linha com offset reduzido para posicionar mais acima
        linhasTexto.forEach((linha, index) => {
            // Ajuste o offset abaixo; sugiro 2px para mover o texto para cima
            const y = pageHeight - topMargin - index * lineSpacing + 4; 
            page.drawText(linha, {
                x: 55,
                y,
                size: tamanhoFonte,
                font: fonte,
                color: preto,
            });
        });
        console.log("📝 Texto adicionado ao PDF!");

        // Adicionar a logo na parte inferior, sem que sobreponha o texto
        const logoPath = path.join(__dirname, "public/logo nome.png");
        console.log("📂 Verificando logo em:", logoPath);
        if (fs.existsSync(logoPath)) {
            console.log("✅ Logo encontrada! Embutindo no PDF...");
            const logoBytes = fs.readFileSync(logoPath);
            const logoImage = await pdfDoc.embedPng(logoBytes);
            page.drawImage(logoImage, {
                x: 175,
                y: 10, // Fica na área reservada para a logo
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
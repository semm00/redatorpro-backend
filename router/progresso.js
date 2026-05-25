import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function monthKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthLabelFromKey(key) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return `${MONTH_LABELS[month - 1]}/${year}`;
}

function normalizeCompetenceKey(rawKey) {
  if (!rawKey) return null;
  const match = rawKey
    .toString()
    .toLowerCase()
    .match(/([1-5])/);
  if (!match) return null;
  return `Competência ${match[1]}`;
}

function round(value, decimals = 1) {
  if (value === null || value === undefined) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

router.get("/", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const tipo = (req.query.tipo || "all").toString().toLowerCase();
    const typeMap = {
      enem: ["enem"],
      vestibular: ["fuvest", "vestibular", "vest"],
      concursos: ["concursos", "fcc", "ita"],
    };
    const allowedTypes = typeMap[tipo] || null;

    const [iaEssays, humanCorrections] = await Promise.all([
      prisma.essay.findMany({
        where: {
          authorId: userId,
          corrigidaPor: "ia",
          notaTotal: { not: null },
          ...(allowedTypes ? { tipoCorrecao: { in: allowedTypes } } : {}),
        },
        select: {
          id: true,
          tema: true,
          notaTotal: true,
          tipoCorrecao: true,
          createdAt: true,
          text: true,
          correcaoIa: true,
        },
      }),
      prisma.correction.findMany({
        where: {
          essay: {
            authorId: userId,
            ...(allowedTypes ? { tipoCorrecao: { in: allowedTypes } } : {}),
          },
          notaTotal: { not: null },
        },
        select: {
          id: true,
          notaTotal: true,
          notas: true,
          comentariosGerais: true,
          updatedAt: true,
          createdAt: true,
          annotations: {
            select: {
              tipo: true,
              rangeStart: true,
              rangeEnd: true,
              snippet: true,
              comment: true,
              createdAt: true,
            },
          },
          essay: {
            select: {
              id: true,
              tema: true,
              tipoCorrecao: true,
              createdAt: true,
              text: true,
              correcaoIa: true,
            },
          },
        },
      }),
    ]);

    const entries = [];
    const monthlyMap = new Map();
    const competenceTotals = {};

    const registerMonthly = (date, type, score) => {
      if (!date || score === null || score === undefined) return;
      const key = monthKey(date);
      if (!key) return;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          label: monthLabelFromKey(key),
          geral: [],
          ia: [],
          humano: [],
        });
      }
      const bucket = monthlyMap.get(key);
      bucket.geral.push(score);
      if (type === "ia") bucket.ia.push(score);
      if (type === "humano") bucket.humano.push(score);
    };

    iaEssays.forEach((essay) => {
      const score = toNumber(essay.notaTotal);
      if (score === null) return;
      entries.push({
        id: essay.id,
        fonte: "IA",
        nota: score,
        tema: essay.tema || "Redação",
        data: essay.createdAt,
        texto: essay.text || null,
        correcaoIa: essay.correcaoIa || null,
      });
      registerMonthly(essay.createdAt, "ia", score);
    });

    humanCorrections.forEach((correction) => {
      const score = toNumber(correction.notaTotal);
      if (score === null) return;
      const dataRef =
        correction.updatedAt ||
        correction.createdAt ||
        correction.essay?.createdAt;
      entries.push({
        id: correction.id,
        fonte: "Corretor",
        nota: score,
        tema: correction.essay?.tema || "Redação",
        data: dataRef,
        notas: correction.notas || null,
        comentariosGerais: correction.comentariosGerais || null,
        annotations: correction.annotations || null,
        texto: correction.essay?.text || null,
        correcaoIa: correction.essay?.correcaoIa || null,
      });
      registerMonthly(dataRef, "humano", score);

      const rawNotas = correction.notas;
      let notasObj = null;
      if (rawNotas && typeof rawNotas === "string") {
        try {
          notasObj = JSON.parse(rawNotas);
        } catch (_) {
          notasObj = null;
        }
      } else if (rawNotas && typeof rawNotas === "object") {
        notasObj = rawNotas;
      }

      if (notasObj && typeof notasObj === "object") {
        Object.entries(notasObj).forEach(([key, value]) => {
          if (typeof value !== "number" || Number.isNaN(value)) return;
          const label = normalizeCompetenceKey(key);
          if (!label) return;
          if (!competenceTotals[label]) {
            competenceTotals[label] = { sum: 0, count: 0 };
          }
          competenceTotals[label].sum += value;
          competenceTotals[label].count += 1;
        });
      }
    });

    const scoreList = entries.map((item) => item.nota);
    const avgScore = scoreList.length
      ? scoreList.reduce((acc, cur) => acc + cur, 0) / scoreList.length
      : null;
    const bestScore = scoreList.length ? Math.max(...scoreList) : null;
    const worstScore = scoreList.length ? Math.min(...scoreList) : null;

    const totalIa = iaEssays.length;
    const totalHumano = humanCorrections.length;

    const selectedType = tipo;

    const now = new Date();
    now.setUTCDate(1);
    const monthsWindow = [];
    for (let i = 5; i >= 0; i -= 1) {
      const ref = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const key = monthKey(ref);
      monthsWindow.push({ key, label: monthLabelFromKey(key) });
    }

    const monthlyScores = monthsWindow.map(({ key, label }) => {
      const bucket = monthlyMap.get(key) || { geral: [], ia: [], humano: [] };
      const avg = bucket.geral.length
        ? bucket.geral.reduce((a, b) => a + b, 0) / bucket.geral.length
        : null;
      const avgIa = bucket.ia.length
        ? bucket.ia.reduce((a, b) => a + b, 0) / bucket.ia.length
        : null;
      const avgHumano = bucket.humano.length
        ? bucket.humano.reduce((a, b) => a + b, 0) / bucket.humano.length
        : null;
      return {
        month: key,
        label,
        mediaGeral: round(avg),
        mediaIa: round(avgIa),
        mediaCorretor: round(avgHumano),
      };
    });

    const competencies = Object.keys(competenceTotals)
      .sort()
      .map((label) => {
        const { sum, count } = competenceTotals[label];
        return {
          label,
          average: round(sum / count, 1),
        };
      });

    const recent = entries
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        fonte: item.fonte,
        nota: item.nota,
        tema: item.tema,
        data: item.data,
        // campos adicionais para análise pela IA
        texto: item.texto || null,
        correcaoIa: item.correcaoIa || null,
        notas: item.notas || null,
        comentariosGerais: item.comentariosGerais || null,
        annotations: item.annotations || null,
      }));

    return res.json({
      overview: {
        totalRedacoes: totalIa + totalHumano,
        iaCount: totalIa,
        corretorCount: totalHumano,
        mediaGeral: round(avgScore),
        melhorNota: bestScore,
        piorNota: worstScore,
        ultimaNota: recent[0]?.nota ?? null,
        ultimaAtualizacao: recent[0]?.data ?? null,
      },
      distribution: {
        ia: totalIa,
        corretor: totalHumano,
      },
      selectedType,
      monthlyScores,
      competencies,
      recent,
    });
  } catch (error) {
    console.error("[GET /progresso] Erro:", error);
    return res.status(500).json({ error: "Erro ao carregar progresso." });
  }
});

export default router;

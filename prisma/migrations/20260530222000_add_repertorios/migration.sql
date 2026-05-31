-- CreateTable
CREATE TABLE "repertorios" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT,
    "coverUrl" TEXT,
    "genre" TEXT,
    "duration" TEXT,
    "rating" TEXT,
    "country" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "pages" TEXT,
    "knowledgeArea" TEXT,
    "info" TEXT,
    "synopsis" TEXT,
    "essayUse" TEXT NOT NULL,
    "trailerUrl" TEXT,
    "thematicAxes" JSONB,
    "streamingLinks" JSONB,
    "sourceLinks" JSONB,
    "highlightedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repertorios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repertorios_category_idx" ON "repertorios"("category");

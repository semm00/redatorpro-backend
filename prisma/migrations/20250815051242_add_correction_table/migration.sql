-- CreateTable
CREATE TABLE "Correction" (
    "id" SERIAL NOT NULL,
    "essayId" INTEGER NOT NULL,
    "corretorId" INTEGER NOT NULL,
    "notas" JSONB,
    "notaTotal" DOUBLE PRECISION,
    "comentariosGerais" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Correction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annotation" (
    "id" SERIAL NOT NULL,
    "correctionId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "rangeStart" INTEGER,
    "rangeEnd" INTEGER,
    "snippet" TEXT,
    "rects" JSONB,
    "color" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Correction" ADD CONSTRAINT "Correction_essayId_fkey" FOREIGN KEY ("essayId") REFERENCES "Essay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correction" ADD CONSTRAINT "Correction_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_correctionId_fkey" FOREIGN KEY ("correctionId") REFERENCES "Correction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `textosMotivadores` on the `Tema` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Tema" DROP COLUMN "textosMotivadores";

-- CreateTable
CREATE TABLE "TextoMotivador" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "temaId" INTEGER NOT NULL,

    CONSTRAINT "TextoMotivador_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TextoMotivador" ADD CONSTRAINT "TextoMotivador_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "Tema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

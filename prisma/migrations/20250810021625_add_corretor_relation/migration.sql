/*
  Warnings:

  - You are about to drop the column `aprovado` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `certificado` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `escolaridade` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `experiencia` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `instagram` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `interesses` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Essay" ADD COLUMN     "corretorId" INTEGER;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "aprovado",
DROP COLUMN "certificado",
DROP COLUMN "escolaridade",
DROP COLUMN "experiencia",
DROP COLUMN "instagram",
DROP COLUMN "interesses",
DROP COLUMN "rating";

-- CreateTable
CREATE TABLE "Corretor" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "experiencia" TEXT,
    "escolaridade" TEXT,
    "certificado" TEXT,
    "aprovado" BOOLEAN DEFAULT false,
    "rating" DOUBLE PRECISION DEFAULT 0.0,

    CONSTRAINT "Corretor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estudante" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "instagram" TEXT,
    "interesses" TEXT[],

    CONSTRAINT "Estudante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Corretor_userId_key" ON "Corretor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Estudante_userId_key" ON "Estudante"("userId");

-- AddForeignKey
ALTER TABLE "Corretor" ADD CONSTRAINT "Corretor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estudante" ADD CONSTRAINT "Estudante_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Essay" ADD CONSTRAINT "Essay_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

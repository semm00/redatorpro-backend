/*
  Warnings:

  - Added the required column `tipo` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "aprovado" BOOLEAN DEFAULT false,
ADD COLUMN     "certificado" TEXT,
ADD COLUMN     "escolaridade" TEXT,
ADD COLUMN     "experiencia" TEXT,
ADD COLUMN     "tipo" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Essay" (
    "id" SERIAL NOT NULL,
    "text" TEXT,
    "urlImage" TEXT,
    "authorId" INTEGER NOT NULL,

    CONSTRAINT "Essay_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Essay" ADD CONSTRAINT "Essay_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

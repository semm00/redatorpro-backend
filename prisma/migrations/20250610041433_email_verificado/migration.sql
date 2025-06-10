-- AlterTable
ALTER TABLE "Essay" ADD COLUMN     "correcaoIa" TEXT,
ADD COLUMN     "corrigidaPor" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "notaTotal" DOUBLE PRECISION,
ADD COLUMN     "tema" TEXT,
ADD COLUMN     "tipoCorrecao" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerificado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Essay" ADD COLUMN     "correcaoVisualizada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "correcaoVisualizadaEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Tema" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "imagem" TEXT NOT NULL,
    "instrucoes" TEXT NOT NULL,
    "textosMotivadores" TEXT[],
    "proposta" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tema_pkey" PRIMARY KEY ("id")
);

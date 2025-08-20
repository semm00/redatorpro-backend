-- CreateTable
CREATE TABLE "Rating" (
    "id" SERIAL NOT NULL,
    "essayId" INTEGER NOT NULL,
    "autorUserId" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rating_essayId_autorUserId_key" ON "Rating"("essayId", "autorUserId");

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_essayId_fkey" FOREIGN KEY ("essayId") REFERENCES "Essay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_autorUserId_fkey" FOREIGN KEY ("autorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "alergene_id" INTEGER;

-- CreateTable
CREATE TABLE "alergenes" (
    "alergene_id" SERIAL NOT NULL,
    "name_fr" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,

    CONSTRAINT "alergenes_pkey" PRIMARY KEY ("alergene_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alergenes_name_fr_key" ON "alergenes"("name_fr");

-- CreateIndex
CREATE UNIQUE INDEX "alergenes_name_en_key" ON "alergenes"("name_en");

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_alergene_id_fkey" FOREIGN KEY ("alergene_id") REFERENCES "alergenes"("alergene_id") ON DELETE SET NULL ON UPDATE NO ACTION;

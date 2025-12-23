-- CreateTable (safe if already exists)
CREATE TABLE IF NOT EXISTS "alergenes" (
    "alergene_id" SERIAL NOT NULL,
    "name_fr" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,

    CONSTRAINT "alergenes_pkey" PRIMARY KEY ("alergene_id")
);

-- CreateTable (safe if already exists)
CREATE TABLE IF NOT EXISTS "ingredients_alergenes" (
    "ingredient_id" INTEGER NOT NULL,
    "alergene_id" INTEGER NOT NULL,

    CONSTRAINT "ingredients_alergenes_pkey" PRIMARY KEY ("ingredient_id","alergene_id")
);

-- CreateIndex (safe if already exists)
CREATE UNIQUE INDEX IF NOT EXISTS "alergenes_name_fr_key" ON "alergenes"("name_fr");

-- CreateIndex (safe if already exists)
CREATE UNIQUE INDEX IF NOT EXISTS "alergenes_name_en_key" ON "alergenes"("name_en");

-- AddForeignKey (safe if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ingredients_alergenes_ingredient_id_fkey'
    ) THEN
        ALTER TABLE "ingredients_alergenes" ADD CONSTRAINT "ingredients_alergenes_ingredient_id_fkey"
        FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("ingredient_id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

-- AddForeignKey (safe if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ingredients_alergenes_alergene_id_fkey'
    ) THEN
        ALTER TABLE "ingredients_alergenes" ADD CONSTRAINT "ingredients_alergenes_alergene_id_fkey"
        FOREIGN KEY ("alergene_id") REFERENCES "alergenes"("alergene_id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

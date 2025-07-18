-- CreateTable
CREATE TABLE "transfers" (
    "id" BIGINT NOT NULL,
    "from_account" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "memo" TEXT,
    "parsed_memo" TEXT,
    "fulfilled" BOOLEAN DEFAULT false,
    "received_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "fulfilled_at" TIMESTAMPTZ(6),

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(10),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "categories_dishes" (
    "category_id" INTEGER NOT NULL,
    "dish_id" INTEGER NOT NULL,

    CONSTRAINT "categories_dishes_pkey" PRIMARY KEY ("category_id","dish_id")
);

-- CreateTable
CREATE TABLE "categories_drinks" (
    "category_id" INTEGER NOT NULL,
    "drink_id" INTEGER NOT NULL,

    CONSTRAINT "categories_drinks_pkey" PRIMARY KEY ("category_id","drink_id")
);

-- CreateTable
CREATE TABLE "cuisson" (
    "cuisson_id" SERIAL NOT NULL,
    "english_name" VARCHAR(50) NOT NULL,
    "french_name" VARCHAR(50) NOT NULL,

    CONSTRAINT "cuisson_pkey" PRIMARY KEY ("cuisson_id")
);

-- CreateTable
CREATE TABLE "currency_conversion" (
    "date" DATE NOT NULL,
    "conversion_rate" DECIMAL(10,4) NOT NULL,

    CONSTRAINT "currency_conversion_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "dishes" (
    "dish_id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "price_eur" DECIMAL(10,2) NOT NULL,
    "record_date" DATE NOT NULL DEFAULT '2025-05-29'::date,
    "image" VARCHAR(255),

    CONSTRAINT "dishes_pkey" PRIMARY KEY ("dish_id")
);

-- CreateTable
CREATE TABLE "dishes_cuisson" (
    "dish_id" INTEGER NOT NULL,
    "cuisson_id" INTEGER NOT NULL,

    CONSTRAINT "dishes_cuisson_pkey" PRIMARY KEY ("dish_id","cuisson_id")
);

-- CreateTable
CREATE TABLE "drink_sizes" (
    "drink_id" INTEGER NOT NULL,
    "size" VARCHAR(50) NOT NULL,
    "price_eur" DECIMAL(10,2) NOT NULL,
    "record_date" DATE NOT NULL DEFAULT '2025-06-01'::date,

    CONSTRAINT "drink_sizes_pkey" PRIMARY KEY ("drink_id","size")
);

-- CreateTable
CREATE TABLE "drinks" (
    "drink_id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "record_date" DATE NOT NULL DEFAULT '2025-06-01'::date,
    "image" VARCHAR(255),

    CONSTRAINT "drinks_pkey" PRIMARY KEY ("drink_id")
);

-- CreateTable
CREATE TABLE "drinks_ingredients" (
    "drink_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,

    CONSTRAINT "drinks_ingredients_pkey" PRIMARY KEY ("drink_id","ingredient_id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "ingredient_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("ingredient_id")
);

-- CreateTable
CREATE TABLE "orders" (
    "order_id" SERIAL NOT NULL,
    "recipient" VARCHAR(50) NOT NULL DEFAULT 'indies.cafe',
    "amount_hbd" DECIMAL(10,3) NOT NULL,
    "memo" VARCHAR(255) NOT NULL,
    "hive_uri" VARCHAR(255),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "restaurant_tables" (
    "table_number" VARCHAR(10) NOT NULL,
    "location" VARCHAR(50) NOT NULL,

    CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("table_number")
);

-- CreateTable
CREATE TABLE "dishes_ingredients" (
    "dish_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,

    CONSTRAINT "dishes_ingredients_pkey" PRIMARY KEY ("dish_id","ingredient_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dishes_name_key" ON "dishes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "drinks_name_key" ON "drinks"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_name_key" ON "ingredients"("name");

-- AddForeignKey
ALTER TABLE "categories_dishes" ADD CONSTRAINT "categories_dishes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categories_dishes" ADD CONSTRAINT "categories_dishes_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("dish_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categories_drinks" ADD CONSTRAINT "categories_drinks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categories_drinks" ADD CONSTRAINT "categories_drinks_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("drink_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dishes_cuisson" ADD CONSTRAINT "dishes_cuisson_cuisson_id_fkey" FOREIGN KEY ("cuisson_id") REFERENCES "cuisson"("cuisson_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dishes_cuisson" ADD CONSTRAINT "dishes_cuisson_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("dish_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "drink_sizes" ADD CONSTRAINT "drink_sizes_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("drink_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "drinks_ingredients" ADD CONSTRAINT "drinks_ingredients_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("drink_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "drinks_ingredients" ADD CONSTRAINT "drinks_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("ingredient_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dishes_ingredients" ADD CONSTRAINT "dishes_ingredients_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("dish_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dishes_ingredients" ADD CONSTRAINT "dishes_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("ingredient_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

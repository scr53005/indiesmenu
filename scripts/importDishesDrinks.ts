import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function importDishesDrinksData() {
  const drinksExcelFilePath = './drinksMenu.xlsx';
  const dishesExcelFilePath = './dishesMenu.xlsx';

  // Use a fixed date for consistency in record_date fields
  const fixedRecordDate = new Date('2025-06-01T00:00:00.000Z');

  // --- Input File Existence Checks ---
  if (!fs.existsSync(drinksExcelFilePath)) {
    console.warn(`Warning: Drinks Excel file not found at ${drinksExcelFilePath}. Skipping drinks import.`);
  }
  if (!fs.existsSync(dishesExcelFilePath)) {
    console.error(`Error: Dishes Excel file not found at ${dishesExcelFilePath}. Cannot import dishes data.`);
    return;
  }

  try {
    // --- STEP 1: Clean existing data (Deletion Order is CRUCIAL for Foreign Key Constraints) ---
    console.log('--- Cleaning existing data from database... ---');

    // Delete from junction/dependent tables first
    await prisma.drinks_ingredients.deleteMany({});
    console.log('Cleaned drinks_ingredients table.');

    await prisma.categories_drinks.deleteMany({});
    console.log('Cleaned categories_drinks table.');

    await prisma.drink_sizes.deleteMany({});
    console.log('Cleaned drink_sizes table.');

    await prisma.dishes_cuisson.deleteMany({});
    console.log('Cleaned dishes_cuisson table.');

    await prisma.dishes_ingredients.deleteMany({});
    console.log('Cleaned dishes_ingredients table.');

    await prisma.categories_dishes.deleteMany({});
    console.log('Cleaned categories_dishes table.');

    // Delete from main item tables
    await prisma.drinks.deleteMany({});
    console.log('Cleaned drinks table.');

    await prisma.dishes.deleteMany({});
    console.log('Cleaned dishes table.');

    // Delete from lookup/parent tables (now safe after their dependents are cleared)
    await prisma.cuisson.deleteMany({}); // Cleaning cuisson as it's typically fixed lookup data for fresh import
    console.log('Cleaned cuisson table.');

    await prisma.ingredients.deleteMany({});
    console.log('Cleaned ingredients table.');

    await prisma.categories.deleteMany({});
    console.log('Cleaned categories table.');

    console.log('--- Database tables cleaned successfully. ---');

    // --- STEP 2: Reset Auto-increment Sequences (for PostgreSQL) ---
    console.log('--- Resetting database sequences... ---');
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('categories', 'category_id'), (SELECT COALESCE(MAX(category_id), 0) + 1 FROM categories), false);`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('drinks', 'drink_id'), (SELECT COALESCE(MAX(drink_id), 0) + 1 FROM drinks), false);`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('ingredients', 'ingredient_id'), (SELECT COALESCE(MAX(ingredient_id), 0) + 1 FROM ingredients), false);`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('dishes', 'dish_id'), (SELECT COALESCE(MAX(dish_id), 0) + 1 FROM dishes), false);`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('cuisson', 'cuisson_id'), (SELECT COALESCE(MAX(cuisson_id), 0) + 1 FROM cuisson), false);`;
    console.log('--- Database sequences reset successfully. ---');

    // --- STEP 3: Define and Process Standard Cuisson Types (Lookup Data) ---
    const standardCuissonTypes = [
      { english_name: 'Rare', french_name: 'Bleu' },
      { english_name: 'Medium Rare', french_name: 'Saignant' },
      { english_name: 'Medium', french_name: 'À point' },
      { english_name: 'Medium Well', french_name: 'Cuit' },
      { english_name: 'Well Done', french_name: 'Bien Cuit' },
    ];
    let allCuissonOptionsInDB: { cuisson_id: number, english_name: string }[] = [];
    const cuissonNameToIdMap = new Map<string, number>();

    await prisma.$transaction(async (tx) => {
      console.log('--- Processing standard cuisson types (find or create)... ---');
      for (const cuissonType of standardCuissonTypes) {
        const existingCuisson = await tx.cuisson.findFirst({
            where: { english_name: cuissonType.english_name }
        });

        let currentCuisson;
        if (existingCuisson) {
            currentCuisson = await tx.cuisson.update({
                where: { cuisson_id: existingCuisson.cuisson_id },
                data: { french_name: cuissonType.french_name }
            });
        } else {
            currentCuisson = await tx.cuisson.create({
                data: { english_name: cuissonType.english_name, french_name: cuissonType.french_name }
            });
        }
        cuissonNameToIdMap.set(currentCuisson.english_name, currentCuisson.cuisson_id);
      }
      allCuissonOptionsInDB = Array.from(cuissonNameToIdMap.entries()).map(([english_name, cuisson_id]) => ({ cuisson_id, english_name }));
      console.log(`Processed ${standardCuissonTypes.length} standard cuisson types. Available in DB: ${allCuissonOptionsInDB.map(c => c.english_name).join(', ')}`);
    });

    // --- STEP 4: Import Drinks Data ---
    if (fs.existsSync(drinksExcelFilePath)) {
        console.log('--- Importing Drinks Data... ---');
        const workbook = XLSX.readFile(drinksExcelFilePath);

        // --- Process PriceList Sheet for Drinks ---
        const priceListSheetNameDrinks = 'PriceList';
        const priceListSheetDrinks = workbook.Sheets[priceListSheetNameDrinks];
        if (!priceListSheetDrinks) {
            console.error(`Error: Sheet "${priceListSheetNameDrinks}" not found in Drinks Excel file. Skipping.`);
        } else {
            const priceListDataDrinks = XLSX.utils.sheet_to_json(priceListSheetDrinks) as {
                Category: string;
                Item: string;
                Size?: string;
                Price: number;
            }[];

            console.log(`Processing ${priceListDataDrinks.length} drink price list entries...`);

            for (const entry of priceListDataDrinks) {
                await prisma.$transaction(async (tx) => {
                    try {
                        // --- Category Handling (Case-insensitive find and create/use) ---
                        let category = await tx.categories.findFirst({
                            where: {
                                name: {
                                    equals: entry.Category,
                                    mode: 'insensitive', // For PostgreSQL, this enables case-insensitive search
                                },
                            },
                        });
                        if (!category) {
                            category = await tx.categories.create({
                                data: {
                                    name: entry.Category,
                                    type: 'drink', // Ensure type is 'drink'
                                },
                            });
                            console.log(`Created drink category: ${category.name}`);
                        } else {
                            console.log(`Found existing category: ${category.name}`);
                        }

                        // --- Drink Handling (Name is now unique) ---
                        const drink = await tx.drinks.upsert({
                            where: {
                                name: entry.Item, // Using 'name' directly as it's now unique
                            },
                            update: {
                            },
                            create: {
                                name: entry.Item,
                                record_date: fixedRecordDate,
                            },
                        });
                        console.log(`Processed drink: ${drink.name}`);

                        // --- Link Drink to Category ---
                        await tx.categories_drinks.upsert({
                            where: {
                                category_id_drink_id: {
                                    category_id: category.category_id,
                                    drink_id: drink.drink_id,
                                },
                            },
                            update: {},
                            create: {
                                category_id: category.category_id,
                                drink_id: drink.drink_id,
                            },
                        });

                        // --- Add Drink Size and Price ---
                        const drinkSizeValue = entry.Size || 'standard'; // Default to 'standard' if Size is not provided
                        if (entry.Price !== undefined && entry.Price !== null) {
                            await tx.drink_sizes.upsert({
                                where: {
                                    drink_id_size: {
                                        drink_id: drink.drink_id,
                                        size: drinkSizeValue,
                                    },
                                },
                                update: {
                                    price_eur: entry.Price,
                                    record_date: fixedRecordDate,
                                },
                                create: {
                                    drink_id: drink.drink_id,
                                    size: drinkSizeValue,
                                    price_eur: entry.Price,
                                    record_date: fixedRecordDate,
                                },
                            });
                        }
                    } catch (error) {
                        console.error(`Error processing price list entry "${entry.Item}" (Category: "${entry.Category}", Size: "${entry.Size || 'N/A'}"):`, error);
                        throw error; // Re-throw to trigger transaction rollback for this entry
                    }
                });
            }
            console.log('Drinks PriceList data imported successfully.');
        }

        // --- Process Ingredients Sheet for Drinks ---
        const ingredientsSheetNameDrinks = 'Ingredients';
        const ingredientsSheetDrinks = workbook.Sheets[ingredientsSheetNameDrinks];
        if (!ingredientsSheetDrinks) {
            console.warn(`Warning: Sheet "${ingredientsSheetNameDrinks}" not found. Skipping ingredients import.`);
        } else {
            const ingredientsDataDrinks = XLSX.utils.sheet_to_json(ingredientsSheetDrinks, { header: 1 }) as string[][];

            console.log(`Processing ${ingredientsDataDrinks.length} drink ingredient entries...`);

            for (const row of ingredientsDataDrinks) {
                if (row.length === 0 || !row[0]) continue;

                const drinkName = row[0];
                const ingredients = row.slice(1);

                await prisma.$transaction(async (tx) => {
                    try {
                        // Find drink using its unique name
                        const drink = await tx.drinks.findUnique({
                            where: { name: drinkName }, // Using 'name' directly as it's now unique
                        });

                        if (!drink) {
                            console.warn(`Drink "${drinkName}" not found for ingredient mapping. Skipping this ingredient row.`);
                            return;
                        }

                        for (const ingredientName of ingredients) {
                            if (!ingredientName) continue;

                            // Find or create ingredient (name is already @unique in your ingredient schema)
                            const ingredient = await tx.ingredients.upsert({
                                where: { name: ingredientName },
                                update: {},
                                create: { name: ingredientName },
                            });
                            console.log(`Processed ingredient: ${ingredient.name}`);

                            // Link drink to ingredient using upsert for re-entrancy
                            await tx.drinks_ingredients.upsert({
                                where: {
                                    drink_id_ingredient_id: {
                                        drink_id: drink.drink_id,
                                        ingredient_id: ingredient.ingredient_id,
                                    },
                                },
                                update: {},
                                create: {
                                    drink_id: drink.drink_id,
                                    ingredient_id: ingredient.ingredient_id,
                                },
                            });
                        }
                    } catch (error) {
                        console.error(`Error processing ingredients for drink "${drinkName}":`, error);
                        throw error;
                    }
                });
            }
            console.log('Drinks Ingredients data imported successfully.');
        }
        console.log('Drinks data imported successfully overall.');
    }

    // --- STEP 5: Import Dishes Data ---
    if (fs.existsSync(dishesExcelFilePath)) {
        console.log('--- Importing Dishes Data... ---');
        const dworkbook = XLSX.readFile(dishesExcelFilePath);

        // --- Process PriceList Sheet for Dishes ---
        const priceListSheetNameDishes = 'PriceList';
        const priceListSheetDishes = dworkbook.Sheets[priceListSheetNameDishes];
        if (!priceListSheetDishes) {
            console.error(`Error: Sheet "${priceListSheetNameDishes}" not found in Dishes Excel file. Skipping.`);
        } else {
            const priceListDataDishes = XLSX.utils.sheet_to_json(priceListSheetDishes) as {
                Category: string;
                Item: string;
                Price: number;
            }[];

            console.log(`Processing ${priceListDataDishes.length} dish price list entries...`);

            for (const entry of priceListDataDishes) {
                await prisma.$transaction(async (tx) => {
                    try {
                        // --- Category Handling (Case-insensitive find and create/use) ---
                        let category = await tx.categories.findFirst({
                            where: {
                                name: {
                                    equals: entry.Category,
                                    mode: 'insensitive', // For PostgreSQL, this enables case-insensitive search
                                },
                            },
                        });
                        if (!category) {
                            category = await tx.categories.create({
                                data: {
                                    name: entry.Category,
                                    type: 'dish', // Ensure type is 'dish'
                                },
                            });
                            console.log(`Created dish category: ${category.name}`);
                        } else {
                            console.log(`Found existing category: ${category.name}`);
                        }

                        // --- Dish Handling (Name is now unique) ---
                        // Line 341 in your original code: this is where the error 'type "{ name: string; }" is not assignable to dishesWhereUniqueInput' occurs.
                        // If 'name' is truly @unique in schema.prisma for Dishes, this syntax is correct.
                        const dish = await tx.dishes.upsert({
                            where: {
                                name: entry.Item, // Using 'name' directly as it's now unique
                            },
                            update: {
                            },
                            create: {
                                name: entry.Item,
                                price_eur: entry.Price,
                                record_date: fixedRecordDate,
                            },
                        });
                        console.log(`Processed dish: ${dish.name}`);

                        // --- Link Dish to Category ---
                        await tx.categories_dishes.upsert({
                            where: {
                                category_id_dish_id: {
                                    category_id: category.category_id,
                                    dish_id: dish.dish_id,
                                },
                            },
                            update: {},
                            create: {
                                category_id: category.category_id,
                                dish_id: dish.dish_id,
                            },
                        });
                    } catch (error) {
                        console.error(`Error processing dish price list entry "${entry.Item}" (Category: "${entry.Category}", Price: "${entry.Price || 'N/A'}"):`, error);
                        throw error; // Re-throw to trigger transaction rollback for this entry
                    }
                });
            }
            console.log('Dishes PriceList data imported successfully.');
        }

        // --- Process Ingredients Sheet for Dishes ---
        const ingredientsSheetNameDishes = 'Ingredients';
        const ingredientsSheetDishes = dworkbook.Sheets[ingredientsSheetNameDishes];
        if (!ingredientsSheetDishes) {
            console.warn(`Warning: Sheet "${ingredientsSheetNameDishes}" not found for dishes. Skipping ingredients import.`);
        } else {
            const ingredientsDataDishes = XLSX.utils.sheet_to_json(ingredientsSheetDishes, { header: 1 }) as string[][];

            console.log(`Processing ${ingredientsDataDishes.length} dish ingredient entries...`);

            for (const row of ingredientsDataDishes) {
                if (row.length === 0 || !row[0]) continue;

                const dishName = row[0];
                const ingredients = row.slice(1);

                await prisma.$transaction(async (tx) => {
                    try {
                        // Find dish using its unique name
                        const dish = await tx.dishes.findUnique({ // Use findUnique if 'name' is truly unique
                            where: { name: dishName },
                        });

                        if (!dish) {
                            console.warn(`Dish "${dishName}" not found for ingredient mapping. Skipping this ingredient row.`);
                            return;
                        }

                        for (const ingredientName of ingredients) {
                            if (!ingredientName) continue;

                            // Find or create ingredient (name is already @unique in your ingredient schema)
                            const ingredient = await tx.ingredients.upsert({
                                where: { name: ingredientName },
                                update: {},
                                create: { name: ingredientName },
                            });
                            console.log(`Processed ingredient: ${ingredient.name}`);

                            // Link dish to ingredient using upsert for re-entrancy
                            await tx.dishes_ingredients.upsert({
                                where: {
                                    dish_id_ingredient_id: {
                                        dish_id: dish.dish_id,
                                        ingredient_id: ingredient.ingredient_id,
                                    },
                                },
                                update: {},
                                create: {
                                    dish_id: dish.dish_id,
                                    ingredient_id: ingredient.ingredient_id,
                                },
                            });
                        }
                    } catch (error) {
                        console.error(`Error processing ingredients for dish "${dishName}":`, error);
                        throw error;
                    }
                });
            }
            console.log('Dishes Ingredients data imported successfully.');
        }

        // --- Process Cuisson Sheet for Dishes ---
        const cuissonSheetNameDishes = 'Cuisson';
        const cuissonSheetDishes = dworkbook.Sheets[cuissonSheetNameDishes];
        if (!cuissonSheetDishes) {
            console.warn(`Warning: Sheet "${cuissonSheetNameDishes}" not found for dishes. Skipping cuisson import.`);
        } else {
            const cuissonDataDishes = XLSX.utils.sheet_to_json(cuissonSheetDishes, { header: 1 }) as string[][];

            console.log(`Processing ${cuissonDataDishes.length} dish cuisson entries...`);

            for (const cuissonEntry of cuissonDataDishes) {
                console.log(`Processing cuisson entry: ${cuissonEntry.join(', ')}`);
                if (cuissonEntry.length === 0 || !cuissonEntry[0]) continue;
                await prisma.$transaction(async (tx) => {
                    try {
                        const dish = await tx.dishes.findUnique({ // Use findUnique if 'name' is truly unique
                            where: { name: cuissonEntry[0] },
                        });

                        if (!dish) {
                            console.warn(`Dish "${cuissonEntry[0]}" not found for cuisson mapping. Skipping this cuisson row.`);
                            return;
                        }

                        // Link this dish to ALL standard cuisson options found in the DB
                        for (const cuissonOption of allCuissonOptionsInDB) {
                            await tx.dishes_cuisson.upsert({
                                where: {
                                    dish_id_cuisson_id: {
                                        dish_id: dish.dish_id,
                                        cuisson_id: cuissonOption.cuisson_id,
                                    },
                                },
                                update: {},
                                create: {
                                    dish_id: dish.dish_id,
                                    cuisson_id: cuissonOption.cuisson_id,
                                },
                            });
                        }
                    } catch (error) {
                        console.error(`Error processing cuisson for dish "${cuissonEntry[0]}":`, error);
                        throw error;
                    }
                });
            }
            console.log('Dishes Cuisson data imported successfully.');
        }
        console.log('Dishes data imported successfully overall.');
    }

  } catch (error) {
    console.error('An unhandled error occurred during data import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importDishesDrinksData();
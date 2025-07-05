import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function importDrinksData() {
  const excelFilePath = './drinksMenu.xlsx';
  const fixedRecordDate = new Date('2025-06-01T00:00:00.000Z'); // Ensure consistent date object for comparison

  if (!fs.existsSync(excelFilePath)) {
    console.error(`Error: Excel file not found at ${excelFilePath}`);
    return;
  }

  try {
    // --- STEP 1: Reset Auto-increment Sequences (for PostgreSQL) ---
    // This makes the script more resilient to P2002 errors caused by desynchronized sequences
    console.log('Resetting database sequences for categories, drinks, and ingredients...');
    await prisma.$executeRaw`
      SELECT setval(pg_get_serial_sequence('categories', 'category_id'),
                     (SELECT COALESCE(MAX(category_id), 0) + 1 FROM categories),
                     false);
    `;
    await prisma.$executeRaw`
      SELECT setval(pg_get_serial_sequence('drinks', 'drink_id'),
                     (SELECT COALESCE(MAX(drink_id), 0) + 1 FROM drinks),
                     false);
    `;
    await prisma.$executeRaw`
      SELECT setval(pg_get_serial_sequence('ingredients', 'ingredient_id'),
                     (SELECT COALESCE(MAX(ingredient_id), 0) + 1 FROM ingredients),
                     false);
    `;
    console.log('Database sequences reset successfully.');
    // Note: The above sequence reset is PostgreSQL-specific. For other databases, you may need to adjust this logic.
    // --- STEP 2: Read Excel File ---    
    const workbook = XLSX.readFile(excelFilePath);

    // --- Process PriceList Sheet ---
    const priceListSheetName = 'PriceList';
    const priceListSheet = workbook.Sheets[priceListSheetName];
    if (!priceListSheet) {
      console.error(`Error: Sheet "${priceListSheetName}" not found in Excel file.`);
      return;
    }
    const priceListData = XLSX.utils.sheet_to_json(priceListSheet) as {
      Category: string;
      Item: string;
      Size?: string;
      Price: number;
    }[];

    console.log(`Processing ${priceListData.length} price list entries...`);

    for (const entry of priceListData) {
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
            // Category not found (even case-insensitively), so create it.
            // This is the point where a P2002 on category_id could still occur
            // if the DB's autoincrement sequence is truly desynchronized for NEW IDs.
            category = await tx.categories.create({
              data: {
                name: entry.Category,
              },
            });
            console.log(`Created category: ${category.name}`);
          } else {
            console.log(`Found existing category: ${category.name}`);
          }

          // --- Drink Handling (Name is now unique) ---
          // Use upsert on 'name' for drinks, as 'name' is now unique in the schema.
          const drink = await tx.drinks.upsert({
            where: {
              name: entry.Item, // Using 'name' directly as it's now unique
            },
            update: {
              // Update record_date if it's not strictly fixed, or other fields
              // For now, no updates needed if item is already present and just its name is unique key.
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
          // Ensure size is not undefined, as it's part of the compound ID
          const drinkSizeValue = entry.Size || '';
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
    console.log('PriceList data imported successfully.');

    // --- Process Ingredients Sheet ---
    const ingredientsSheetName = 'Ingredients';
    const ingredientsSheet = workbook.Sheets[ingredientsSheetName];
    if (!ingredientsSheet) {
      console.warn(`Warning: Sheet "${ingredientsSheetName}" not found. Skipping ingredients import.`);
    } else {
      const ingredientsData = XLSX.utils.sheet_to_json(ingredientsSheet, { header: 1 }) as string[][];

      console.log(`Processing ${ingredientsData.length} ingredient entries...`);

      for (const row of ingredientsData) {
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
      console.log('Ingredients data imported successfully.');
    }

  } catch (error) {
    console.error('An unhandled error occurred during data import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importDrinksData();
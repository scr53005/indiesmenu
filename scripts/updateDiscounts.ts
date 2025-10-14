import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateDiscounts() {
  try {
    await prisma.$executeRaw`UPDATE "Dish" SET discount = 0.9;`;
    await prisma.$executeRaw`UPDATE "DrinkSize" SET discount = 0.9;`;
    console.log('Discounts updated successfully!');
  } catch (error) {
    console.error('Error updating discounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDiscounts();
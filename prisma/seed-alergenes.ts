// Seed script to populate the alergenes table with EU-regulated allergens
// Based on EU Regulation 1169/2011 (14 mandatory allergens)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const alergenes = [
  {
    name_fr: 'Céréales contenant du gluten',
    name_en: 'Cereals containing gluten',
  },
  {
    name_fr: 'Crustacés',
    name_en: 'Crustaceans',
  },
  {
    name_fr: 'Œufs',
    name_en: 'Eggs',
  },
  {
    name_fr: 'Poissons',
    name_en: 'Fish',
  },
  {
    name_fr: 'Arachides',
    name_en: 'Peanuts',
  },
  {
    name_fr: 'Soja',
    name_en: 'Soybeans',
  },
  {
    name_fr: 'Lait',
    name_en: 'Milk',
  },
  {
    name_fr: 'Fruits à coque',
    name_en: 'Nuts',
  },
  {
    name_fr: 'Céleri',
    name_en: 'Celery',
  },
  {
    name_fr: 'Moutarde',
    name_en: 'Mustard',
  },
  {
    name_fr: 'Graines de sésame',
    name_en: 'Sesame seeds',
  },
  {
    name_fr: 'Anhydride sulfureux et sulfites',
    name_en: 'Sulphur dioxide and sulphites',
  },
  {
    name_fr: 'Lupin',
    name_en: 'Lupin',
  },
  {
    name_fr: 'Mollusques',
    name_en: 'Molluscs',
  },
];

async function main() {
  console.log('🌱 Seeding alergenes table with EU-regulated allergens...');

  for (const alergene of alergenes) {
    const result = await prisma.alergenes.upsert({
      where: { name_en: alergene.name_en },
      update: {},
      create: alergene,
    });
    console.log(`✓ Created/verified: ${result.name_en} / ${result.name_fr}`);
  }

  console.log(`\n✅ Successfully seeded ${alergenes.length} allergens`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding alergenes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

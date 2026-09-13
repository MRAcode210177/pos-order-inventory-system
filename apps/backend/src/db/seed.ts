import { initDb, db } from './index.js';
import { products } from './schema.js';
import { count } from 'drizzle-orm';

const INITIAL_PRODUCTS = [
  {
    name: 'Nitro Cold Brew (16oz)',
    sku: 'BEV-NCB-01',
    priceCents: 550,
    stockQuantity: 40,
    category: 'Beverages',
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Vanilla Oat Milk Latte',
    sku: 'BEV-LAT-02',
    priceCents: 600,
    stockQuantity: 35,
    category: 'Beverages',
    imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Ceremonial Matcha Latte',
    sku: 'BEV-MAT-03',
    priceCents: 650,
    stockQuantity: 25,
    category: 'Beverages',
    imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Single Origin Pour-Over',
    sku: 'BEV-POUR-04',
    priceCents: 500,
    stockQuantity: 30,
    category: 'Beverages',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Espresso Doppio',
    sku: 'BEV-ESP-05',
    priceCents: 350,
    stockQuantity: 50,
    category: 'Beverages',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Artisan Butter Croissant',
    sku: 'BAK-CRS-01',
    priceCents: 425,
    stockQuantity: 15,
    category: 'Bakery',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Pain au Chocolat',
    sku: 'BAK-PAC-02',
    priceCents: 475,
    stockQuantity: 12,
    category: 'Bakery',
    imageUrl: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Almond Frangipane Tart',
    sku: 'BAK-ALM-03',
    priceCents: 525,
    stockQuantity: 10,
    category: 'Bakery',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'House Blend Whole Bean (250g)',
    sku: 'MER-BN-01',
    priceCents: 1850,
    stockQuantity: 20,
    category: 'Merchandise',
    imageUrl: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Insulated Travel Tumbler 16oz',
    sku: 'MER-TUM-02',
    priceCents: 2400,
    stockQuantity: 8,
    category: 'Merchandise',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Limited Edition Espresso Cup',
    sku: 'MER-CUP-03',
    priceCents: 1600,
    stockQuantity: 5, // Low stock for race condition demo!
    category: 'Merchandise',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=60',
  },
];

export async function seedProducts() {
  await initDb();
  console.log('🌱 Seeding database products...');

  const [existing] = await db.select({ total: count() }).from(products);
  if (existing && existing.total > 0) {
    console.log(`Database already has ${existing.total} products. Skipping initial seed.`);
    return;
  }

  for (const item of INITIAL_PRODUCTS) {
    await db.insert(products).values(item);
  }

  console.log(`✅ Successfully seeded ${INITIAL_PRODUCTS.length} products into the catalog.`);
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seedProducts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}

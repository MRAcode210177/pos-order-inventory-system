import { initDb, db } from '../db/index.js';
import { products, orders, orderItems, payments } from '../db/schema.js';
import { count, desc } from 'drizzle-orm';

async function displayDatabaseSummary() {
  await initDb();

  console.log('\n====================================================');
  console.log('📊 DATABASE INVENTORY & ORDERS SUMMARY');
  console.log('====================================================\n');

  // 1. Products Summary
  const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
  console.log(`📦 TOTAL PRODUCTS: ${allProducts.length}`);
  console.log('----------------------------------------------------');
  if (allProducts.length === 0) {
    console.log('No products found. (Run `pnpm seed` to add sample products)');
  } else {
    const formattedProducts = allProducts.map((p: any) => ({
      ID: p.id.substring(0, 8) + '...',
      Name: p.name,
      SKU: p.sku,
      Price: `$${(p.priceCents / 100).toFixed(2)}`,
      Stock: p.stockQuantity,
      Status: p.isActive ? 'Active' : 'Archived',
      Version: `v${p.version}`,
      Category: p.category,
    }));
    console.table(formattedProducts);
  }

  // 2. Orders Summary
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  console.log(`\n🧾 TOTAL ORDERS: ${allOrders.length}`);
  console.log('----------------------------------------------------');
  if (allOrders.length === 0) {
    console.log('No orders placed yet.');
  } else {
    const formattedOrders = allOrders.map((o: any) => ({
      ID: o.id.substring(0, 8) + '...',
      Status: o.status,
      Total: `$${(o.totalCents / 100).toFixed(2)}`,
      CreatedAt: new Date(o.createdAt).toLocaleString(),
      ExpiresAt: o.expiresAt ? new Date(o.expiresAt).toLocaleTimeString() : '—',
    }));
    console.table(formattedOrders);
  }

  // 3. Overall Statistics
  const totalStockUnits = allProducts.reduce((sum: number, p: any) => sum + p.stockQuantity, 0);
  const reservedOrders = allOrders.filter((o: any) => o.status === 'RESERVED').length;
  const paidOrders = allOrders.filter((o: any) => o.status === 'PAID' || o.status === 'COMPLETED').length;
  const cancelledOrders = allOrders.filter((o: any) => o.status === 'CANCELLED').length;
  const expiredOrders = allOrders.filter((o: any) => o.status === 'EXPIRED').length;

  console.log('\n----------------------------------------------------');
  console.log('📈 QUICK STATS:');
  console.log(`• Total Stock In Hand:   ${totalStockUnits} units`);
  console.log(`• Reserved Orders:       ${reservedOrders}`);
  console.log(`• Paid / Completed:      ${paidOrders}`);
  console.log(`• Cancelled Orders:      ${cancelledOrders}`);
  console.log(`• Expired Orders:        ${expiredOrders}`);
  console.log('====================================================\n');
}

displayDatabaseSummary()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error querying database:', err);
    process.exit(1);
  });

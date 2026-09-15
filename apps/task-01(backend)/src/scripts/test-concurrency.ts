import { initDb, db } from '../db/index.js';
import { products, orders } from '../db/schema.js';
import { createOrder } from '../services/orderService.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function runConcurrencyStressTest() {
  console.log('====================================================');
  console.log('⚡ STARTING CONCURRENCY STOCK RESERVATION STRESS TEST');
  console.log('====================================================\n');

  await initDb();

  const INITIAL_STOCK = 5;
  const TOTAL_CONCURRENT_REQUESTS = 25;
  const testSku = `TEST-CONCURRENCY-${Date.now()}`;

  // 1. Create a special test product with strictly 5 units of stock
  console.log(`1️⃣ Creating test item '${testSku}' with exactly ${INITIAL_STOCK} units in stock...`);
  const [testProduct] = await db
    .insert(products)
    .values({
      name: 'Limited Edition Stress Test Item',
      sku: testSku,
      priceCents: 1500,
      stockQuantity: INITIAL_STOCK,
      category: 'StressTest',
    })
    .returning();

  if (!testProduct) {
    throw new Error('Failed to create test product');
  }

  console.log(`   Product ID: ${testProduct.id}`);
  console.log(`   Initial Stock: ${testProduct.stockQuantity}\n`);

  // 2. Launch 25 simultaneous order requests in parallel
  console.log(`2️⃣ Firing ${TOTAL_CONCURRENT_REQUESTS} simultaneous order requests (1 unit each)...`);
  const startTime = Date.now();

  const results = await Promise.allSettled(
    Array.from({ length: TOTAL_CONCURRENT_REQUESTS }).map(async (_, idx) => {
      const order = await createOrder({
        items: [{ productId: testProduct.id, quantity: 1 }],
      });
      return { buyerIndex: idx + 1, orderId: order.id, status: order.status };
    })
  );

  const durationMs = Date.now() - startTime;

  // 3. Analyze results
  let successCount = 0;
  let insufficientStockCount = 0;
  let unexpectedErrors: any[] = [];

  results.forEach((res, idx) => {
    if (res.status === 'fulfilled') {
      successCount++;
    } else {
      const err = res.reason;
      if (err?.code === 'INSUFFICIENT_STOCK' || err?.message?.includes('Insufficient stock')) {
        insufficientStockCount++;
      } else {
        unexpectedErrors.push({ buyer: idx + 1, error: err?.message || err });
      }
    }
  });

  // 4. Query final product stock from database
  const [finalProduct] = await db
    .select()
    .from(products)
    .where(eq(products.id, testProduct.id));

  console.log(`\n====================================================`);
  console.log(`📊 CONCURRENCY STRESS TEST RESULTS (${durationMs}ms)`);
  console.log(`====================================================`);
  console.log(`• Initial Stock:                  ${INITIAL_STOCK}`);
  console.log(`• Concurrent Buyer Requests:       ${TOTAL_CONCURRENT_REQUESTS}`);
  console.log(`• Successful Reservations (201):   ${successCount}`);
  console.log(`• Insufficient Stock (409):        ${insufficientStockCount}`);
  console.log(`• Unexpected Errors:               ${unexpectedErrors.length}`);
  console.log(`• Final Stock Remaining in DB:     ${finalProduct?.stockQuantity}`);
  console.log(`====================================================\n`);

  // 5. Run Assertions
  let passed = true;

  if (successCount !== INITIAL_STOCK) {
    console.error(`❌ ASSERTION FAILED: Expected ${INITIAL_STOCK} successes, got ${successCount}`);
    passed = false;
  }

  if (insufficientStockCount !== TOTAL_CONCURRENT_REQUESTS - INITIAL_STOCK) {
    console.error(
      `❌ ASSERTION FAILED: Expected ${TOTAL_CONCURRENT_REQUESTS - INITIAL_STOCK} 409 errors, got ${insufficientStockCount}`
    );
    passed = false;
  }

  if (finalProduct?.stockQuantity !== 0) {
    console.error(`❌ ASSERTION FAILED: Expected final stock 0, got ${finalProduct?.stockQuantity}`);
    passed = false;
  }

  if (unexpectedErrors.length > 0) {
    console.error('❌ Unexpected errors encountered:', unexpectedErrors);
    passed = false;
  }

  if (passed) {
    console.log('🎉 100% PASS: Concurrency safety verified! Zero overselling under race conditions.\n');
  } else {
    console.error('💥 TEST FAILED: Stock reservation logic permitted a race condition.\n');
    process.exit(1);
  }
}

runConcurrencyStressTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error during concurrency test:', err);
    process.exit(1);
  });

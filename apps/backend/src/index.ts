import { app } from './app.js';
import { initDb } from './db/index.js';
import { seedProducts } from './db/seed.js';
import { startExpiryWorker } from './workers/expiryWorker.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

async function bootstrap() {
  try {
    // 1. Initialize Database
    await initDb();

    // 2. Seed default catalog if empty
    await seedProducts();

    // 3. Start background order expiry worker
    startExpiryWorker(30000);

    // 4. Start HTTP Server
    app.listen(PORT, () => {
      console.log(`
🚀 POS Backend Server running at http://localhost:${PORT}
📦 Endpoints:
   • GET   /api/health
   • GET   /api/products
   • POST  /api/products
   • PATCH /api/products/:id/stock
   • GET   /api/orders
   • POST  /api/orders (Concurrency-Safe Stock Reservation)
   • GET   /api/orders/:id
   • POST  /api/orders/:id/cancel
   • POST  /api/orders/:id/pay
      `);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();

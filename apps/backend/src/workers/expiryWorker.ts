import { expireStaleOrders } from '../services/orderService.js';

let intervalTimer: NodeJS.Timeout | null = null;

export function startExpiryWorker(intervalMs: number = 30000) {
  if (intervalTimer) return;

  console.log(`⏱️ Starting Order Expiry Worker (running every ${intervalMs / 1000}s)...`);

  const runSweep = async () => {
    try {
      const expiredCount = await expireStaleOrders();
      if (expiredCount > 0) {
        console.log(`🧹 Order Expiry Worker: Automatically expired ${expiredCount} stale orders and restored inventory.`);
      }
    } catch (err) {
      console.error('Error running order expiry sweep:', err);
    }
  };

  // Run initial sweep
  runSweep();

  // Run on interval
  intervalTimer = setInterval(runSweep, intervalMs);
}

export function stopExpiryWorker() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
    console.log('⏹️ Order Expiry Worker stopped.');
  }
}

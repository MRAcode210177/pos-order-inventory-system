import { db } from '../db/index.js';
import { orders, payments, orderItems, products } from '../db/schema.js';
import { sql, eq } from 'drizzle-orm';
import { AppError } from '../errors/AppError.js';
import { mockPaymentGateway } from './mockPaymentGateway.js';
import { getOrderById } from './orderService.js';
import type { PayOrderRequest, OrderDto, PaymentDto } from '@pos/shared-types';

export async function processPayment(
  orderId: string,
  request: PayOrderRequest
): Promise<{ order: OrderDto; payment: PaymentDto }> {
  return db.transaction(async (tx: any) => {
    // 1. Check Idempotency Key
    const [existingPayment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.idempotencyKey, request.idempotencyKey))
      .limit(1);

    if (existingPayment) {
      if (existingPayment.orderId !== orderId) {
        throw new AppError(
          'IDEMPOTENCY_CONFLICT',
          `Idempotency key '${request.idempotencyKey}' was already used for a different order (${existingPayment.orderId})`
        );
      }

      // If already processed for this order, return idempotently
      const order = await getOrderById(orderId);
      return {
        order,
        payment: {
          id: existingPayment.id,
          orderId: existingPayment.orderId,
          status: existingPayment.status,
          idempotencyKey: existingPayment.idempotencyKey,
          transactionId: existingPayment.transactionId ?? undefined,
          createdAt: new Date(existingPayment.createdAt).toISOString(),
        },
      };
    }

    // 2. Lock Order row for payment processing and evaluate expiry using SQL NOW()
    const result = await tx.execute(
      sql`SELECT id, status, total_cents, expires_at, (expires_at IS NOT NULL AND expires_at < NOW()) AS is_expired FROM orders WHERE id = ${orderId} FOR UPDATE`
    );
    const rows = Array.isArray(result) ? result : (result?.rows ?? []);
    const order = rows[0];

    if (!order) {
      throw new AppError('NOT_FOUND', `Order with ID ${orderId} not found`);
    }

    if (order.status === 'PAID' || order.status === 'COMPLETED') {
      throw new AppError('INVALID_STATE_TRANSITION', 'Order has already been paid and completed');
    }

    if (order.status === 'CANCELLED') {
      throw new AppError('INVALID_STATE_TRANSITION', 'Order has been cancelled and cannot be paid');
    }

    if (order.status === 'EXPIRED' || order.is_expired) {
      // If expired, restore inventory and update status
      if (order.status === 'RESERVED') {
        const items = await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, orderId));

        for (const item of items) {
          await tx
            .update(products)
            .set({
              stockQuantity: sql`${products.stockQuantity} + ${item.quantity}`,
              version: sql`${products.version} + 1`,
            })
            .where(eq(products.id, item.productId));
        }

        await tx
          .update(orders)
          .set({ status: 'EXPIRED' })
          .where(eq(orders.id, orderId));
      }

      throw new AppError('ORDER_EXPIRED', 'Order reservation time limit has passed. Stock has been returned.');
    }

    if (order.status !== 'RESERVED') {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        `Cannot pay for order in '${order.status}' status. Expected 'RESERVED'.`
      );
    }

    // 3. Process payment via Mock Payment Gateway
    const gatewayResult = await mockPaymentGateway.processPayment(
      request.cardNumber,
      order.total_cents
    );

    if (!gatewayResult.success) {
      // Record failed payment attempt
      await tx.insert(payments).values({
        orderId,
        status: 'FAILED',
        idempotencyKey: request.idempotencyKey,
      });

      throw new AppError('PAYMENT_FAILED', `Payment declined: ${gatewayResult.reason}`);
    }

    // 4. Payment succeeded: update order and record payment
    const [paymentRecord] = await tx
      .insert(payments)
      .values({
        orderId,
        status: 'SUCCESS',
        idempotencyKey: request.idempotencyKey,
        transactionId: gatewayResult.transactionId,
      })
      .returning();

    await tx
      .update(orders)
      .set({ status: 'PAID' })
      .where(eq(orders.id, orderId));

    const updatedOrder = await getOrderById(orderId);

    return {
      order: updatedOrder,
      payment: {
        id: paymentRecord.id,
        orderId: paymentRecord.orderId,
        status: paymentRecord.status,
        idempotencyKey: paymentRecord.idempotencyKey,
        transactionId: paymentRecord.transactionId ?? undefined,
        createdAt: new Date(paymentRecord.createdAt).toISOString(),
      },
    };
  });
}

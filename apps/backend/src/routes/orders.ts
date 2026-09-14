import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createOrderSchema, payOrderSchema } from '../schemas/orderSchemas.js';
import {
  createOrder,
  getOrderById,
  listOrders,
  cancelOrder,
} from '../services/orderService.js';
import { processPayment } from '../services/paymentService.js';
import type { ApiResult, OrderDto, OrderStatus, PaymentDto } from '@pos/shared-types';

export const ordersRouter = Router();

// POST /api/orders — Concurrency-Safe Stock Reservation & Order Creation
ordersRouter.post('/', validate(createOrderSchema), async (req, res, next) => {
  try {
    const order = await createOrder(req.body);
    const body: ApiResult<OrderDto> = { ok: true, data: order };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders — List all orders (supports ?status=..., page, limit)
ordersRouter.get('/', async (req, res, next) => {
  try {
    const status = req.query['status'] ? (String(req.query['status']) as OrderStatus) : undefined;
    const page = req.query['page'] ? parseInt(String(req.query['page']), 10) : undefined;
    const limit = req.query['limit'] ? parseInt(String(req.query['limit']), 10) : undefined;
    const result = await listOrders(status, page, limit);
    const body: ApiResult<OrderDto[]> = {
      ok: true,
      data: result.items,
      pagination: result.pagination,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id — Get order details
ordersRouter.get('/:id', async (req, res, next) => {
  try {
    const order = await getOrderById(req.params.id!);
    const body: ApiResult<OrderDto> = { ok: true, data: order };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/cancel — Cancel order & release reserved stock
ordersRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const order = await cancelOrder(req.params.id!);
    const body: ApiResult<OrderDto> = { ok: true, data: order };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/pay — Process payment with Idempotency Key
ordersRouter.post('/:id/pay', validate(payOrderSchema), async (req, res, next) => {
  try {
    const result = await processPayment(req.params.id!, req.body);
    const body: ApiResult<{ order: OrderDto; payment: PaymentDto }> = {
      ok: true,
      data: result,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

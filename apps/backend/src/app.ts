import express from 'express';
import cors from 'cors';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';
import { errorHandler } from './middleware/errorHandler.js';
import type { ApiResult } from '@pos/shared-types';

export const app = express();

// Middleware
app.use(
  cors({
    origin: '*', // Allow all origins for easy development / demo
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  })
);
app.use(express.json());

// Health Check
app.get('/api/health', (_req, res) => {
  const body: ApiResult<{ status: string; timestamp: string }> = {
    ok: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  };
  res.json(body);
});

// Routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

// Centralized typed error handler
app.use(errorHandler);

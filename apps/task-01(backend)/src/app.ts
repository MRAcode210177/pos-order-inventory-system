import express from 'express';
import cors from 'cors';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';
import { errorHandler } from './middleware/errorHandler.js';
import type { ApiResult } from '@pos/shared-types';

export const app = express();

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  })
);
app.use(express.json());

// Request Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const { method, url } = req;
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const isError = status >= 400;
    const icon = isError ? '⚠️' : '✅';
    console.log(`${icon} [${method}] ${url} -> ${status} (${duration}ms)`);
  });

  next();
});

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

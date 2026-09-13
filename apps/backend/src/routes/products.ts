import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createProductSchema, updateStockSchema } from '../schemas/productSchemas.js';
import {
  listProducts,
  getProductById,
  createProduct,
  updateStock,
} from '../services/productService.js';
import type { ApiResult, ProductDto } from '@pos/shared-types';

export const productsRouter = Router();

// GET /api/products — list products
productsRouter.get('/', async (req, res, next) => {
  try {
    const search = req.query['search'] ? String(req.query['search']) : undefined;
    const category = req.query['category'] ? String(req.query['category']) : undefined;
    const products = await listProducts(search, category);
    const body: ApiResult<ProductDto[]> = { ok: true, data: products };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id — get product by ID
productsRouter.get('/:id', async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id!);
    const body: ApiResult<ProductDto> = { ok: true, data: product };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

// POST /api/products — create new product
productsRouter.post('/', validate(createProductSchema), async (req, res, next) => {
  try {
    const product = await createProduct(req.body);
    const body: ApiResult<ProductDto> = { ok: true, data: product };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/products/:id/stock — adjust stock level
productsRouter.patch('/:id/stock', validate(updateStockSchema), async (req, res, next) => {
  try {
    const product = await updateStock(req.params.id!, req.body.quantityDelta);
    const body: ApiResult<ProductDto> = { ok: true, data: product };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

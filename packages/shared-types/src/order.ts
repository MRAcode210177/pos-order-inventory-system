// A discriminated union derived from a const array — single source of truth for DB enums & TS
export const ORDER_STATUSES = [
  'PENDING',
  'RESERVED',
  'PAID',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItemDto {
  productId: string;
  quantity: number;
  unitPriceCents: number;
  productName?: string;
}

export interface OrderDto {
  id: string;
  status: OrderStatus;
  totalCents: number;
  expiresAt: string | null;
  createdAt?: string;
  items: OrderItemDto[];
}

export interface CreateOrderRequest {
  items: { productId: string; quantity: number }[];
}

export interface PayOrderRequest {
  cardNumber: string;
  idempotencyKey: string;
}

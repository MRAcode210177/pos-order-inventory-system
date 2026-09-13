export interface PaymentDto {
  id: string;
  orderId: string;
  status: string;
  idempotencyKey: string;
  transactionId?: string;
  createdAt?: string;
}

// Discriminated union for payment gateway responses
export type PaymentGatewayResult =
  | { success: true; transactionId: string }
  | { success: false; reason: string };

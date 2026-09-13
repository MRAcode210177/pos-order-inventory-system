import type { PaymentGatewayResult } from '@pos/shared-types';
import { v4 as uuidv4 } from 'uuid';

export class MockPaymentGateway {
  /**
   * Process a simulated payment.
   * Returns a typed discriminated union so callers can exhaustively check success/failure.
   */
  async processPayment(
    cardNumber: string,
    amountCents: number
  ): Promise<PaymentGatewayResult> {
    // Artificial small delay to simulate real network gateway latency (10-30ms)
    await new Promise((resolve) => setTimeout(resolve, 20));

    const cleanCard = cardNumber.replace(/\D/g, '');

    // Card ending in 0000 or 9999 triggers intentional decline
    if (cleanCard.endsWith('0000') || cleanCard.endsWith('9999')) {
      return {
        success: false,
        reason: 'Card was declined by issuing bank (insufficient funds)',
      };
    }

    // Card ending in 8888 triggers fraud alert
    if (cleanCard.endsWith('8888')) {
      return {
        success: false,
        reason: 'Payment flagged by fraud prevention filters',
      };
    }

    // Card ending in 7777 triggers gateway timeout
    if (cleanCard.endsWith('7777')) {
      return {
        success: false,
        reason: 'Gateway timeout communicating with processor',
      };
    }

    // All other valid card patterns succeed
    return {
      success: true,
      transactionId: `txn_${Date.now()}_${uuidv4().substring(0, 8)}`,
    };
  }
}

export const mockPaymentGateway = new MockPaymentGateway();

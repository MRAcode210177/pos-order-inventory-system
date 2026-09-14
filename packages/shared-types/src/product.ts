export interface ProductDto {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  stockQuantity: number;
  version: number;
  category?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateProductRequest {
  name: string;
  sku: string;
  priceCents: number;
  stockQuantity: number;
  category?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface UpdateStockRequest {
  quantityDelta: number; // positive to add stock, negative to deduct
}

export interface UpdateProductRequest {
  name?: string;
  sku?: string;
  priceCents?: number;
  stockQuantity?: number;
  category?: string;
  imageUrl?: string;
  isActive?: boolean;
}



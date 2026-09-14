import type {
  ApiResult,
  ProductDto,
  CreateProductRequest,
  OrderDto,
  CreateOrderRequest,
  PayOrderRequest,
  OrderStatus,
  PaymentDto,
} from '@pos/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<ApiResult<T>> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    const data = (await res.json()) as ApiResult<T>;
    return data;
  } catch (err: any) {
    console.error(`❌ [Frontend API Network Failure] ${options?.method || 'GET'} ${url}:`, err);
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err?.message || 'Failed to connect to the backend server. Make sure it is running.',
      },
    };
  }
}

// Products API
export async function fetchProducts(
  search?: string,
  category?: string,
  includeInactive: boolean = false,
  page?: number,
  limit?: number
): Promise<ApiResult<ProductDto[]>> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category && category !== 'All') params.set('category', category);
  if (includeInactive) params.set('includeInactive', 'true');
  if (page) params.set('page', page.toString());
  if (limit) params.set('limit', limit.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<ProductDto[]>(`/products${query}`);
}

export async function fetchProduct(id: string): Promise<ApiResult<ProductDto>> {
  return request<ProductDto>(`/products/${id}`);
}

export async function createProduct(data: CreateProductRequest): Promise<ApiResult<ProductDto>> {
  return request<ProductDto>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProduct(id: string, data: Partial<CreateProductRequest>): Promise<ApiResult<ProductDto>> {
  return request<ProductDto>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function toggleProductStatus(id: string): Promise<ApiResult<ProductDto>> {
  return request<ProductDto>(`/products/${id}/toggle-status`, {
    method: 'PATCH',
  });
}

export async function deleteProduct(id: string): Promise<ApiResult<{ id: string; name: string }>> {
  return request<{ id: string; name: string }>(`/products/${id}`, {
    method: 'DELETE',
  });
}

export async function updateProductStock(id: string, delta: number): Promise<ApiResult<ProductDto>> {
  return request<ProductDto>(`/products/${id}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ quantityDelta: delta }),
  });
}

// Orders API
export async function createOrder(data: CreateOrderRequest): Promise<ApiResult<OrderDto>> {
  return request<OrderDto>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchOrders(
  status?: OrderStatus,
  page?: number,
  limit?: number
): Promise<ApiResult<OrderDto[]>> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page) params.set('page', page.toString());
  if (limit) params.set('limit', limit.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<OrderDto[]>(`/orders${query}`);
}

export async function fetchOrder(id: string): Promise<ApiResult<OrderDto>> {
  return request<OrderDto>(`/orders/${id}`);
}

export async function cancelOrder(id: string): Promise<ApiResult<OrderDto>> {
  return request<OrderDto>(`/orders/${id}/cancel`, {
    method: 'POST',
  });
}

export async function payOrder(
  id: string,
  data: PayOrderRequest
): Promise<ApiResult<{ order: OrderDto; payment: PaymentDto }>> {
  return request<{ order: OrderDto; payment: PaymentDto }>(`/orders/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

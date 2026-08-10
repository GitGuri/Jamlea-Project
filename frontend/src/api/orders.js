import apiClient from './client';

export const getCustomerOrders = () => apiClient.get('/orders/my-orders');

export const getOrderById = (id) => apiClient.get(`/orders/${id}`);

export const getAllOrdersAdmin = () => apiClient.get('/orders/admin/all');

export const updateOrderStatus = (id, status) =>
  apiClient.patch(`/orders/${id}/status`, { status });

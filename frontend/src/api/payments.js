import apiClient from './client';

export const createPayment = (payment) => apiClient.post('/payments', payment);

export const getAllPaymentsAdmin = () => apiClient.get('/payments/admin/all');

export const updatePaymentStatus = (id, status) =>
  apiClient.patch(`/payments/${id}/status`, { status });

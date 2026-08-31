import apiClient from './client';

export const createPayment = (payment) => apiClient.post('/payments', payment);

export const getAllPaymentsAdmin = () => apiClient.get('/payments/admin/all');

export const updatePaymentStatus = (id, status) =>
  apiClient.patch(`/payments/${id}/status`, { status });

// Same unset-Content-Type reasoning as the product image/import uploads --
// axios/the browser needs to generate its own multipart boundary from the
// FormData object, which only happens when Content-Type is left unset.
export const uploadPaymentProof = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/payments/upload-proof', formData);
};

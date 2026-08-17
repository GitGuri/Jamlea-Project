import apiClient from './client';

export const getAllCustomersAdmin = ({ search, page = 1, limit = 20 } = {}) =>
  apiClient.get('/customers/admin/all', { params: { search, page, limit } });

export const getCustomerDetailAdmin = (id) => apiClient.get(`/customers/admin/${id}`);

import apiClient from './client';

export const getProducts = ({ search, category, page = 1, limit = 20 } = {}) =>
  apiClient.get('/products', { params: { search, category, page, limit } });

export const getProductById = (id) => apiClient.get(`/products/${id}`);

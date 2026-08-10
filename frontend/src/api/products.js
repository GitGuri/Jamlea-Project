import apiClient from './client';

export const getProducts = ({ search, category, page = 1, limit = 20 } = {}) =>
  apiClient.get('/products', { params: { search, category, page, limit } });

export const getProductById = (id) => apiClient.get(`/products/${id}`);

export const createProduct = (product) => apiClient.post('/products', product);

export const updateProduct = (id, product) => apiClient.patch(`/products/${id}`, product);

export const deleteProduct = (id) => apiClient.delete(`/products/${id}`);

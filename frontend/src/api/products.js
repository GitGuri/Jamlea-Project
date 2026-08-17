import apiClient from './client';

export const getProducts = ({ search, category, page = 1, limit = 20 } = {}) =>
  apiClient.get('/products', { params: { search, category, page, limit } });

export const getProductById = (id) => apiClient.get(`/products/${id}`);

export const createProduct = (product) => apiClient.post('/products', product);

export const updateProduct = (id, product) => apiClient.patch(`/products/${id}`, product);

export const deleteProduct = (id) => apiClient.delete(`/products/${id}`);

// Don't set a Content-Type header here -- axios/the browser needs to generate
// its own multipart boundary from the FormData object, which only happens
// when Content-Type is left unset. Setting 'multipart/form-data' manually
// (no boundary) produces a body the server can't parse.
export const uploadProductImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return apiClient.post('/products/upload-image', formData);
};

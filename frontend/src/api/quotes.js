import apiClient from './client';

export const createQuote = (items) => apiClient.post('/quotes', { items });

export const createQuoteForCustomerAdmin = (customerId, items) =>
  apiClient.post('/quotes/admin/for-customer', { customer_id: customerId, items });

export const getCustomerQuotes = () => apiClient.get('/quotes/my-quotes');

export const getQuoteById = (quoteId) => apiClient.get(`/quotes/${quoteId}`);

export const convertQuoteToOrder = (quoteId) =>
  apiClient.post(`/quotes/${quoteId}/convert`);

export const getAllQuotesAdmin = () => apiClient.get('/quotes/admin/all');

export const updateQuoteStatus = (quoteId, status) =>
  apiClient.patch(`/quotes/${quoteId}/status`, { status });

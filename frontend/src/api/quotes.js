import apiClient from './client';

// NOTE: quoteRoutes.js wasn't shared with me, so these paths follow the
// standard REST pattern that matches your controller functions. Double check
// against your actual routes file and adjust here if any path differs -
// this is the only place that needs to change.

export const createQuote = (items) => apiClient.post('/quotes', { items });

export const getCustomerQuotes = () => apiClient.get('/quotes');

export const getQuoteById = (quoteId) => apiClient.get(`/quotes/${quoteId}`);

export const convertQuoteToOrder = (quoteId) =>
  apiClient.post(`/quotes/${quoteId}/convert`);

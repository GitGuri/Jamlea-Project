import apiClient from './client';

// NOTE: same caveat as quotes.js - orderRoutes.js wasn't shared, paths below
// match the controller function names using the standard REST pattern.

export const getCustomerOrders = () => apiClient.get('/orders');

export const getOrderById = (id) => apiClient.get(`/orders/${id}`);

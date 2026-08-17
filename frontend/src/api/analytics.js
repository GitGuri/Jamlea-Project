import apiClient from './client';

export const getAnalyticsSummary = () => apiClient.get('/analytics/admin/summary');

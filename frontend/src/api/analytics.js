import apiClient from './client';

export const getAnalyticsSummary = ({ from, to } = {}) =>
  apiClient.get('/analytics/admin/summary', { params: { from, to } });

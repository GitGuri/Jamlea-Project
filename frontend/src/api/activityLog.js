import apiClient from './client';

export const getActivityLog = ({ page = 1, limit = 50 } = {}) =>
  apiClient.get('/activity-log', { params: { page, limit } });

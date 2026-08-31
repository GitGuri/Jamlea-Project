import apiClient from './client';

export const getPendingReviews = () => apiClient.get('/admin/reviews');

export const resolveReview = (id, action) =>
  apiClient.post(`/admin/reviews/${id}/resolve`, { action });

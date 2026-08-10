import apiClient from './client';

// NOTE: same caveat - notificationRoutes.js wasn't shared, paths below match
// the controller function names using the standard REST pattern.

export const getMyNotifications = () => apiClient.get('/notifications');

export const markAsRead = (id) => apiClient.patch(`/notifications/${id}/read`);

export const markAllAsRead = () => apiClient.patch('/notifications/read-all');

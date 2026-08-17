import apiClient from './client';

export const getPendingStaffAdmin = () => apiClient.get('/auth/staff/pending');

export const reviewStaffSignupAdmin = (id, status) =>
  apiClient.patch(`/auth/staff/${id}/status`, { status });

import apiClient from './client';

export const registerRequest = (email, password, company_name, role, full_name, phone) =>
  apiClient.post('/auth/register', { email, password, company_name, role, full_name, phone });

export const loginRequest = (email, password) =>
  apiClient.post('/auth/login', { email, password });

export const oauthCompleteRequest = (access_token) =>
  apiClient.post('/auth/oauth-complete', { access_token });

export const getMeRequest = () => apiClient.get('/auth/me');

export const updateMeRequest = (phone) => apiClient.patch('/auth/me', { phone });

export const forgotPasswordRequest = (email) => apiClient.post('/auth/forgot-password', { email });

export const resetPasswordRequest = (access_token, password) =>
  apiClient.post('/auth/reset-password', { access_token, password });

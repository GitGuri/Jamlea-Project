import apiClient from './client';

export const registerRequest = (email, password, company_name, role, full_name) =>
  apiClient.post('/auth/register', { email, password, company_name, role, full_name });

export const loginRequest = (email, password) =>
  apiClient.post('/auth/login', { email, password });

export const getMeRequest = () => apiClient.get('/auth/me');

import apiClient from './client';

export const createStaffUser = (email, password, company_name, role) =>
  apiClient.post('/auth/staff', { email, password, company_name, role });

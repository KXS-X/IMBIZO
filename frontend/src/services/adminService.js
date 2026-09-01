import api from './api';

export const adminService = {
  async getAllUsers(search = '', role = '') {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    const response = await api.get(`/users?${params.toString()}`);
    return response.data;
  },

  async updateUserRole(userId, role) {
    const response = await api.put(`/users/${userId}/role`, { role });
    return response.data;
  },

  async createUser(userData) {
    const response = await api.post('/users', userData);
    return response.data;
  },

  async deleteUser(userId) {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  }
};

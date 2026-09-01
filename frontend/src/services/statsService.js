import api from './api';

export const statsService = {
  async getPlatformStats() {
    const response = await api.get('/stats/platform');
    return response.data;
  }
};

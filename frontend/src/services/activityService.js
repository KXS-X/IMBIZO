import api from './api';

export const activityService = {
  async getProjectActivities(projectId, limit = 100) {
    const response = await api.get(`/projects/${projectId}/activities?limit=${limit}`);
    return response.data;
  }
};

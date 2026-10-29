import api from './api';

export const featureService = {
  async getProjectFeatures(projectId) {
    const response = await api.get(`/projects/${projectId}/features`);
    return response.data;
  },

  async createFeature(projectId, featureData) {
    const response = await api.post(`/projects/${projectId}/features`, featureData);
    return response.data;
  },

  async updateFeature(featureId, featureData) {
    const response = await api.put(`/features/${featureId}`, featureData);
    return response.data;
  },

  async deleteFeature(featureId) {
    const response = await api.delete(`/features/${featureId}`);
    return response.data;
  }
};


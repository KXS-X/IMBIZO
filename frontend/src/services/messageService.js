import api from './api';

export const messageService = {
  async getProjectMessages(projectId, limit = 100) {
    const response = await api.get(`/projects/${projectId}/messages?limit=${limit}`);
    return response.data;
  },

  async sendMessage(projectId, content) {
    const response = await api.post(`/projects/${projectId}/messages`, { content });
    return response.data;
  },

  async sendMessageWithAttachments(projectId, content, files) {
    const formData = new FormData();
    if (content?.trim()) formData.append('content', content.trim());
    files.forEach((file) => formData.append('files', file));

    const response = await api.post(`/projects/${projectId}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};

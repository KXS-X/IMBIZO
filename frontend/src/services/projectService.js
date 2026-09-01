import api from './api';

export const projectService = {
  async getUserProjects(all = false) {
    const response = await api.get(`/projects${all ? '?all=true' : ''}`);
    return response.data;
  },

  async getProjectById(projectId) {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  },

  async getAvailableMembers(projectId) {
    const response = await api.get(`/projects/${projectId}/available-members`);
    return response.data;
  },

  async createProject(projectData) {
    const response = await api.post('/projects', projectData);
    return response.data;
  },

  async updateProject(projectId, projectData) {
    const response = await api.put(`/projects/${projectId}`, projectData);
    return response.data;
  },

  async deleteProject(projectId) {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },

  async addMember(projectId, userId, role) {
    const response = await api.post(`/projects/${projectId}/members`, { userId, role });
    return response.data;
  },

  async removeMember(projectId, memberId) {
    const response = await api.delete(`/projects/${projectId}/members/${memberId}`);
    return response.data;
  },

  async updateMemberRole(projectId, memberId, role) {
    const response = await api.put(`/projects/${projectId}/members/${memberId}/role`, { role });
    return response.data;
  }
};

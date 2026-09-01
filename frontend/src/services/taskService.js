import api from './api';

export const taskService = {
  async getProjectTasks(projectId, filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.assignedToId) params.append('assignedToId', filters.assignedToId);
    if (filters.search) params.append('search', filters.search);

    const response = await api.get(`/projects/${projectId}/tasks?${params.toString()}`);
    return response.data;
  },

  async getMyTasks(status) {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/tasks/my-tasks${params}`);
    return response.data;
  },

  async createTask(projectId, taskData) {
    const response = await api.post(`/projects/${projectId}/tasks`, taskData);
    return response.data;
  },

  async updateTask(taskId, taskData) {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data;
  },

  async toggleTaskStatus(taskId) {
    const response = await api.patch(`/tasks/${taskId}/toggle`);
    return response.data;
  },

  async deleteTask(taskId) {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },

  async signalNoTask(projectId) {
    const response = await api.post('/tasks/signal-no-task', { projectId });
    return response.data;
  }
};

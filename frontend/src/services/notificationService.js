import api from './api';

export const notificationService = {
  async getNotifications(unreadOnly = false) {
    const response = await api.get(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`);
    return response.data;
  },

  async markAsRead(notificationId) {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllAsRead() {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  async deleteNotification(notificationId) {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  }
};

import api from './axios'

export const resourceApi = {
  getAll: (params) => api.get('/api/resources', { params }),
  getById: (id) => api.get(`/api/resources/${id}`),
  create: (data) => api.post('/api/resources', data),
  update: (id, data) => api.put(`/api/resources/${id}`, data),
  delete: (id) => api.delete(`/api/resources/${id}`),
}

export const authApi = {
  getMe: () => api.get('/api/auth/me'),
  getUsers: () => api.get('/api/auth/users'),
  getUser: (id) => api.get(`/api/auth/users/${id}`),
  updateUser: (id, data) => api.put(`/api/auth/users/${id}`, data),
  updateRole: (id, role) => api.put(`/api/auth/users/${id}/role`, null, { params: { role } }),
  deleteUser: (id) => api.delete(`/api/auth/users/${id}`),
}

export const bookingApi = {
  getAll: (params) => api.get('/api/bookings', { params }),
  getById: (id) => api.get(`/api/bookings/${id}`),
  create: (data) => api.post('/api/bookings', data),
  updateStatus: (id, data) => api.put(`/api/bookings/${id}/status`, data),
  delete: (id) => api.delete(`/api/bookings/${id}`),
}

export const ticketApi = {
  getAll: (params) => api.get('/api/tickets', { params }),
  getById: (id) => api.get(`/api/tickets/${id}`),
  create: (data) => api.post('/api/tickets', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateStatus: (id, data) => api.put(`/api/tickets/${id}/status`, data),
  assign: (id, data) => api.put(`/api/tickets/${id}/assign`, data),
  delete: (id) => api.delete(`/api/tickets/${id}`),
  addComment: (id, data) => api.post(`/api/tickets/${id}/comments`, data),
  updateComment: (ticketId, commentId, data) =>
    api.put(`/api/tickets/${ticketId}/comments/${commentId}`, data),
  deleteComment: (ticketId, commentId) =>
    api.delete(`/api/tickets/${ticketId}/comments/${commentId}`),
}

export const notificationApi = {
  getAll: () => api.get('/api/notifications'),
  getUnreadCount: () => api.get('/api/notifications/unread/count'),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  delete: (id) => api.delete(`/api/notifications/${id}`),
}

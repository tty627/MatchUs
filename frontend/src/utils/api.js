import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verifyEmail: (params) => api.get('/auth/verify-email', { params }),
};

export const profileAPI = {
  getMe: () => api.get('/profile/me'),
  completeProfile: (data) => api.put('/profile/complete', data),
  deleteAccount: () => api.delete('/profile/me'),
  uploadAvatar: (formData) => api.post('/profile/avatar', formData),
};

export const postsAPI = {
  getPosts: () => api.get('/posts'),
  getPost: (id) => api.get(`/posts/${id}`),
  createPost: (data) => api.post('/posts', data),
  updatePost: (id, data) => api.put(`/posts/${id}`, data),
  deletePost: (id) => api.delete(`/posts/${id}`),
  participate: (id) => api.post(`/posts/${id}/participate`),
  cancelParticipation: (id) => api.delete(`/posts/${id}/participate`),
  getParticipants: (id) => api.get(`/posts/${id}/participants`),
  kickParticipant: (postId, userId) => api.delete(`/posts/${postId}/participants/${userId}`),
};

export default api;

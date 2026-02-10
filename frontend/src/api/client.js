import axios from 'axios';

// Detect API URL based on current environment
const API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? `http://localhost:3000`
    : process.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getTopics = (userId = null) => {
  const params = userId ? { userId } : {};
  return apiClient.get('/api/topics', { params });
};

export const getTopic = (id) => {
  return apiClient.get(`/api/topics/${id}`);
};

export const createTopic = (topicData) => {
  return apiClient.post('/api/topics', topicData);
};

export const deleteTopic = (id) => {
  return apiClient.delete(`/api/topics/${id}`);
};

export const getStatusStats = () => {
  return apiClient.get('/api/status/all');
};

export const triggerProcessing = () => {
  return apiClient.post('/api/process-now');
};

export const regenerateScript = (id) => {
  return apiClient.post(`/api/topics/${id}/regenerate`);
};

export const updateScript = (id, narrationScript) => {
  return apiClient.put(`/api/topics/${id}/script`, { narrationScript });
};

export const generateTitles = (id) => {
  return apiClient.post(`/api/topics/${id}/generate-titles`);
};

export const selectTitle = (id, title) => {
  return apiClient.post(`/api/topics/${id}/select-title`, { title });
};

export const updateTitle = (id, title) => {
  return apiClient.put(`/api/topics/${id}/update-title`, { title });
};


export const generateThumbnails = (id) => {
  return apiClient.post(`/api/topics/${id}/generate-thumbnails`);
};

export const selectThumbnail = (id, thumbnail) => {
  return apiClient.post(`/api/topics/${id}/select-thumbnail`, { thumbnail });
};

export const generateExtraAssets = (id) => {
  return apiClient.post(`/api/topics/${id}/generate-extra-assets`);
};

export const markAsEditing = (id) => {
  return apiClient.post(`/api/topics/${id}/mark-editing`);
};

export const markAsUploaded = (id) => {
  return apiClient.post(`/api/topics/${id}/mark-uploaded`);
};

// ==================== KEYWORDS API ====================

export const getKeywords = (params = {}) => {
  return apiClient.get('/api/keywords', { params });
};

export const getKeyword = (id) => {
  return apiClient.get(`/api/keywords/${id}`);
};

export const updateKeyword = (id, data) => {
  return apiClient.put(`/api/keywords/${id}`, data);
};

export const deleteKeyword = (id) => {
  return apiClient.delete(`/api/keywords/${id}`);
};

export const addKeywordToTitle = (id) => {
  return apiClient.post(`/api/keywords/${id}/add-to-title`);
};

export const removeKeywordFromTitle = (id) => {
  return apiClient.post(`/api/keywords/${id}/remove-from-title`);
};

export const uploadKeywords = (files, userId = 'default-user') => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('userId', userId);

  return apiClient.post('/api/keywords/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getKeywordStats = (userId = null) => {
  const params = userId ? { userId } : {};
  return apiClient.get('/api/keywords/stats', { params });
};

export default apiClient;

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

export default apiClient;

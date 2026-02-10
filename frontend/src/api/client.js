import axios from 'axios';

// Detect API URL based on current environment
// Priority: 1) Environment variable, 2) Auto-detect based on hostname, 3) Fallback to localhost
const getApiBaseUrl = () => {
  // First check if VITE_API_BASE_URL is set in environment
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Auto-detect based on window location (for development/production)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // If on localhost, use localhost backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }

    // If on a remote server, assume backend is on same host with port 3000
    // This works for Digital Ocean droplets where both frontend and backend are on same server
    return `${protocol}//${hostname}:3000`;
  }

  // Fallback
  return 'http://localhost:3000';
};

const API_BASE_URL = getApiBaseUrl();

// Log the API URL for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('🔗 API Base URL:', API_BASE_URL);
}


const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',
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

export const addKeywordToIdeas = (id) => {
  return apiClient.post(`/api/keywords/${id}/add-to-ideas`);
};

export const removeFromIdeas = (ideaId) => {
  return apiClient.post(`/api/keywords/remove/remove-from-ideas`, { ideaId });
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

// ==================== IDEAS API ====================

export const getIdeas = (params = {}) => {
  return apiClient.get('/api/ideas', { params });
};

export const getIdea = (id) => {
  return apiClient.get(`/api/ideas/${id}`);
};

export const updateIdea = (id, data) => {
  return apiClient.put(`/api/ideas/${id}`, data);
};

export const deleteIdea = (id) => {
  return apiClient.delete(`/api/ideas/${id}`);
};

export const getIdeaStats = (userId = null) => {
  const params = userId ? { userId } : {};
  return apiClient.get('/api/ideas/stats', { params });
};

export const convertIdeaToTopic = (id) => {
  return apiClient.post(`/api/ideas/${id}/convert-to-topic`);
};

export default apiClient;

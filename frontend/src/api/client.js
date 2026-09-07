import axios from 'axios';

// Use relative paths since frontend and API are now in the same Next.js app
const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== TOPICS API ====================

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
  return apiClient.get('/api/topics/status/all');
};

export const triggerProcessing = () => {
  return apiClient.post('/api/topics/process-now');
};

export const regenerateScript = (id, comments = null) => {
  return apiClient.post(`/api/topics/${id}/regenerate`, { comments });
};

export const updateScript = (id, narrationScript) => {
  return apiClient.put(`/api/topics/${id}/script`, { narrationScript });
};

export const updateDescription = (id, description) => {
  return apiClient.put(`/api/topics/${id}/description`, { description });
};

export const updateKeywords = (id, keywords) => {
  return apiClient.put(`/api/topics/${id}/keywords`, { keywords });
};

export const updateTopicName = (id, topicName) => {
  return apiClient.put(`/api/topics/${id}/name`, { topicName });
};

export const updateInstructions = (id, stepByStepInstructions) => {
  return apiClient.put(`/api/topics/${id}/instructions`, { stepByStepInstructions });
};

export const generateTitles = (id) => {
  return apiClient.post(`/api/topics/${id}/generate-titles`);
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

export const uploadThumbnail = (id, file) => {
  const formData = new FormData();
  formData.append('thumbnail', file);
  return apiClient.post(`/api/topics/${id}/upload-thumbnail`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const skipThumbnail = (id) => {
  return apiClient.post(`/api/topics/${id}/skip-thumbnail`);
};

export const generateExtraAssets = (id) => {
  return apiClient.post(`/api/topics/${id}/generate-extra-assets`);
};

export const generateVideoChapters = (id, transcript) => {
  return apiClient.post(`/api/topics/${id}/generate-chapters`, { transcript });
};

export const regenerateAudio = (id, script = null) => {
  return apiClient.post(`/api/topics/${id}/regenerate-audio`, { script });
};

export const updateAudioUrl = (id, audioUrl, audioUrls = null) => {
  return apiClient.put(`/api/topics/${id}/audio`, { audioUrl, audioUrls });
};

export const markAsEditing = (id) => {
  return apiClient.post(`/api/topics/${id}/mark-editing`);
};

export const markAsUploaded = (id) => {
  return apiClient.post(`/api/topics/${id}/mark-uploaded`);
};

export const generateRecordingCues = (id) => {
  return apiClient.post(`/api/topics/${id}/generate-cues`);
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

export const uploadKeywords = (files, userId = 'default-user') => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('userId', userId);
  return apiClient.post('/api/keywords/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getKeywordStats = (userId = null) => {
  const params = userId ? { userId } : {};
  return apiClient.get('/api/keywords/stats', { params });
};

// ==================== SEGREGATOR API ====================

export const getGroupingsGroups = () => {
  return apiClient.get('/api/segregator/groupings-groups');
};

export const createGroupingsGroupEmpty = (title, description = '', userId = 'default-user') => {
  return apiClient.post('/api/segregator/groupings-groups', { title, description, userId });
};

export const getGroupingsGroup = (id) => {
  return apiClient.get(`/api/segregator/groupings-groups/${id}`);
};

export const updateGroupingsGroup = (id, title, description) => {
  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  return apiClient.put(`/api/segregator/groupings-groups/${id}`, data);
};

export const deleteGroupingsGroup = (id) => {
  return apiClient.delete(`/api/segregator/groupings-groups/${id}`);
};

export const uploadToGroupingsGroup = (id, files, userId = 'default-user', rowNumbers = '') => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('userId', userId);
  if (rowNumbers) {
    formData.append('rowNumbers', rowNumbers);
  }
  return apiClient.post(`/api/segregator/groups/${id}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const flushGroupingsGroups = () => {
  return apiClient.delete('/api/segregator/groupings-groups');
};

export const getSegregatorGroups = (groupingsGroupId) => {
  return apiClient.get('/api/segregator/groups', { params: { groupingsGroupId } });
};

export const createSegregatorGroup = (title, groupingsGroupId, userId = 'default-user') => {
  return apiClient.post('/api/segregator/groups', { title, groupingsGroupId, userId });
};

export const deleteSegregatorGroup = (id) => {
  return apiClient.delete(`/api/segregator/groups/${id}`);
};

export const updateSegregatorGroup = (id, title) => {
  return apiClient.put(`/api/segregator/groups/${id}`, { title });
};

export const updateSegregatorGroupDescription = (id, description) => {
  return apiClient.put(`/api/segregator/groups/${id}/description`, { description });
};

export const updateSegregatorGroupPriority = (id, priority) => {
  return apiClient.put(`/api/segregator/groups/${id}/priority`, { priority });
};

export const flushSegregatorGroups = () => {
  return apiClient.delete('/api/segregator/groups');
};

export const updateSegregatorKeywordGroups = (keyword, targetGroupIds, groupingsGroupId, userId = 'default-user') => {
  return apiClient.put('/api/segregator/groups/keyword', { keyword, targetGroupIds, groupingsGroupId, userId });
};

export const uploadSegregatorFiles = (files, groupingsGroupTitle, customGroupsList = '', userId = 'default-user') => {
  const formData = new FormData();
  files.forEach((file) => {
    if (file) {
      formData.append('files', file);
    }
  });
  formData.append('userId', userId);
  formData.append('groupingsGroupTitle', groupingsGroupTitle);
  formData.append('customGroupsList', customGroupsList);
  return apiClient.post('/api/segregator/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const fetchMediaAsBlobUrl = async (url) => {
  if (!url) return null;
  try {
    const path = url.replace(/^http(s)?:\/\/[^\/]+/, '');
    const response = await apiClient.get(path, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  } catch (err) {
    console.error('Failed to fetch media as blob:', err);
    return url;
  }
};

export default apiClient;

export const updateUploadInfo = (id, localVideoPath, privacyStatus) => {
  return apiClient.put(`/api/topics/${id}/upload-info`, { localVideoPath, privacyStatus });
};

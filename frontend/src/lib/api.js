const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getLang() {
  return localStorage.getItem('pw_lang') || 'en';
}

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const identifyByName = (name) =>
  request('/identify/by-name', { method: 'POST', body: JSON.stringify({ name, lang: getLang() }) });

export const identifyByImage = (image, mimeType) =>
  request('/identify/by-image', { method: 'POST', body: JSON.stringify({ image, mimeType, lang: getLang() }) });

export const generateCareGuide = (plantName, scientificName, plantId) =>
  request('/care-guide/generate', { method: 'POST', body: JSON.stringify({ plantName, scientificName, plantId, lang: getLang() }) });

export const getUserPlants = (userId) => request(`/plants/user/${userId}`);
export const getPlant = (plantId) => request(`/plants/${plantId}`);
export const addPlant = (plantData) => request('/plants', { method: 'POST', body: JSON.stringify(plantData) });
export const deletePlant = (plantId) => request(`/plants/${plantId}`, { method: 'DELETE' });
export const updatePlant = (plantId, updates) => request(`/plants/${plantId}`, { method: 'PATCH', body: JSON.stringify(updates) });
export const refreshPlantImage = (plantId, plantName, scientificName) =>
  request(`/plants/${plantId}/refresh-image`, { method: 'POST', body: JSON.stringify({ plantName, scientificName }) });

export const sendChatMessage = (plantId, message, userId) =>
  request(`/chat/${plantId}/message`, { method: 'POST', body: JSON.stringify({ message, userId, lang: getLang() }) });

export const getChatHistory = (plantId) => request(`/chat/${plantId}/history`);
export const clearChatHistory = (plantId) => request(`/chat/${plantId}/history`, { method: 'DELETE' });

export const getJournal = (plantId) => request(`/journal/${plantId}`);
export const addJournalEntry = (entry) => request('/journal', { method: 'POST', body: JSON.stringify(entry) });
export const deleteJournalEntry = (entryId) => request(`/journal/${entryId}`, { method: 'DELETE' });

export const getNotifications = (userId) => request(`/notifications/user/${userId}`);
export const markNotificationRead = (notifId) => request(`/notifications/${notifId}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = (userId) => request(`/notifications/user/${userId}/read-all`, { method: 'PATCH' });

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
      URL.revokeObjectURL(objectUrl);
      resolve(base64);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };
    img.src = objectUrl;
  });
}

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Resolve base URL dinamica para modo Electron
let electronBaseUrl = null;

api.interceptors.request.use(async (config) => {
  if (window.electronAPI && !electronBaseUrl) {
    const backendUrl = await window.electronAPI.getBackendUrl();
    electronBaseUrl = `${backendUrl}/api`;
  }
  if (electronBaseUrl) {
    config.baseURL = electronBaseUrl;
  }
  return config;
});

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ========== BOOKINGS ==========
export const bookingsAPI = {
  getAll: (params = {}) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  delete: (id) => api.delete(`/bookings/${id}`),
  getUpcoming: (params = {}) => api.get('/bookings/upcoming', { params }),
};

// ========== CALENDAR ==========
export const calendarAPI = {
  getEvents: (params) => api.get('/calendar/events', { params }),
  sync: () => api.post('/calendar/sync'),
  getSources: (propertyId) => api.get('/calendar/sources', { params: { property_id: propertyId } }),
};

// ========== CONFLICTS ==========
export const conflictsAPI = {
  getAll: (params) => api.get('/conflicts', { params }),
  getSummary: (propertyId) => api.get('/conflicts/summary', { params: { property_id: propertyId } }),
  resolve: (id, notes) => api.post(`/conflicts/${id}/resolve`, { resolution_notes: notes }),
  detect: (propertyId) => api.post('/conflicts/detect', null, { params: { property_id: propertyId } }),
};

// ========== STATISTICS ==========
export const statisticsAPI = {
  getDashboard: (propertyId) => api.get('/statistics/dashboard', { params: { property_id: propertyId } }),
  getOccupancy: (params) => api.get('/statistics/occupancy', { params }),
  getRevenue: (params) => api.get('/statistics/revenue', { params }),
  getPlatforms: (params) => api.get('/statistics/platforms', { params }),
  getMonthlyReport: (propertyId, month, year, sendEmail = false) =>
    api.get('/statistics/monthly-report', {
      params: {
        property_id: propertyId,
        month,
        year,
        send_email: sendEmail
      }
    }),
};

// ========== SYNC ACTIONS ==========
export const syncActionsAPI = {
  getAll: (params) => api.get('/sync-actions', { params }),
  markDone: (id) => api.post(`/sync-actions/${id}/mark-done`),
  dismiss: (id) => api.post(`/sync-actions/${id}/dismiss`),
};

// ========== SYSTEM INFO ==========
export const systemAPI = {
  getInfo: () => api.get('/info'),
  getHealth: () => api.get('/health'),
};

// ========== DOCUMENTS (MVP2) ==========
export const documentsAPI = {
  generate: (data) => api.post('/v1/documents/generate', data),
  generateFromBooking: (data) => api.post('/v1/documents/generate-from-booking', data),
  generateReceiptFromBooking: (data) => api.post('/v1/documents/generate-receipt-from-booking', data),
  list: (params = {}) => api.get('/v1/documents/list', { params }),
  download: (filename) => api.get(`/v1/documents/download/${filename}`, { responseType: 'blob' }),
  delete: (filename) => api.delete(`/v1/documents/${filename}`),
  generateAndDownload: (data) => api.post('/v1/documents/generate-and-download', data, { responseType: 'blob' }),
};

// ========== EMAILS (MVP2) ==========
export const emailsAPI = {
  send: (data) => api.post('/v1/emails/send', data),
  sendTemplate: (data) => api.post('/v1/emails/send-template', data),
  sendBookingConfirmation: (data) => api.post('/v1/emails/send-booking-confirmation', data),
  sendCheckinReminder: (data) => api.post('/v1/emails/send-checkin-reminder', data),
  sendBulkReminders: (params = {}) => api.post('/v1/emails/send-bulk-reminders', null, { params }),
  fetch: (data) => api.post('/v1/emails/fetch', data),
  testConnection: () => api.get('/v1/emails/test-connection'),
};

// ========== SETTINGS ==========
export const settingsAPI = {
  getAll: () => api.get('/v1/settings'),
  update: (data) => api.put('/v1/settings', data),
};

// ========== NOTIFICATIONS ==========
export const notificationsAPI = {
  getAll: (params = {}) => api.get('/v1/notifications', { params }),
  getSummary: () => api.get('/v1/notifications/summary'),
  markAsRead: (id) => api.put(`/v1/notifications/${id}/read`),
  markAllAsRead: () => api.put('/v1/notifications/read-all'),
};

export default api;

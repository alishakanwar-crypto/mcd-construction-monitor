const BACKEND_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = BACKEND_URL + '/api';

export function getMediaUrl(filePath) {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  return BACKEND_URL + filePath;
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }

  return res.json();
}

export const api = {
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getMe: () => request('/auth/me'),

  getUsers: () => request('/auth/users'),

  registerUser: (data) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  toggleUser: (userId) =>
    request(`/auth/users/${userId}/toggle`, { method: 'PUT' }),

  createReport: (data) =>
    request('/reports/', { method: 'POST', body: JSON.stringify(data) }),

  getReports: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/?${qs}`);
  },

  getReport: (id) => request(`/reports/${id}`),

  updateReportStatus: (id, status) =>
    request(`/reports/${id}/status?new_status=${status}`, { method: 'PUT' }),

  uploadMedia: (reportId, formData) =>
    request(`/media/upload/${reportId}`, { method: 'POST', body: formData }),

  getReportMedia: (reportId) => request(`/media/report/${reportId}`),

  getLatestMedia: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/media/latest?${qs}`);
  },

  deleteMedia: (id) => request(`/media/${id}`, { method: 'DELETE' }),

  deleteReport: (id) => request(`/reports/${id}`, { method: 'DELETE' }),

  extractImageData: (formData) =>
    request('/image-extract/', { method: 'POST', body: formData }),

  geocodeCoordinates: (lat, lng) =>
    request(`/image-extract/geocode?latitude=${lat}&longitude=${lng}`, { method: 'POST' }),

  getDailySummary: (date) => {
    const qs = date ? `?date=${date}` : '';
    return request(`/reports-summary/daily${qs}`);
  },

  getZoneReport: (zone, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports-summary/zone/${zone}?${qs}`);
  },

  getStats: () => request('/reports-summary/stats'),

  getLiveFeed: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/control-panel/live-feed?${qs}`);
  },

  getZones: () => request('/control-panel/zones'),

  getActivityTypes: () => request('/control-panel/activity-types'),
};

export function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

export function isAdmin() {
  const u = getUser();
  return u?.role === 'admin';
}

export function isExecutiveEngineer() {
  const u = getUser();
  return u?.role === 'executive_engineer';
}

export function getRoleLabel(role) {
  const labels = {
    admin: 'Administrator',
    executive_engineer: 'Executive Engineer',
    junior_engineer: 'Junior Engineer',
    assistant_engineer: 'Assistant Engineer',
  };
  return labels[role] || role;
}

export function getActivityLabel(type) {
  const labels = {
    unauthorized_construction: 'Unauthorized Construction',
    unauthorized_urbanisation: 'Unauthorized Urbanisation',
    construction_on_govt_land: 'Construction on Govt Land',
    deviation_from_sanctioned_plan: 'Deviation from Sanctioned Plan',
    encroachment: 'Encroachment',
    other: 'Other',
  };
  return labels[type] || type;
}

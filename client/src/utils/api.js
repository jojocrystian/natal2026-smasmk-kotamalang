const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('presensi_token');
}

export function setToken(token) {
  localStorage.setItem('presensi_token', token);
}

export function clearAuth() {
  localStorage.removeItem('presensi_token');
  localStorage.removeItem('presensi_user');
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('presensi_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  localStorage.setItem('presensi_user', JSON.stringify(user));
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMsg = data && data.error ? data.error : `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// Authentication
export async function login(username, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  setToken(data.token);
  setCurrentUser(data.user);
  return data;
}

export async function fetchMe() {
  return await apiFetch('/auth/me');
}

export async function getUsers() {
  return await apiFetch('/auth/users');
}

export async function createUser(payload) {
  return await apiFetch('/auth/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function deleteUser(id) {
  return await apiFetch(`/auth/users/${id}`, {
    method: 'DELETE'
  });
}

// Event Information
export async function getEventInfo() {
  return await apiFetch('/event');
}

export async function updateEventInfo(payload) {
  return await apiFetch('/event', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function uploadFlyer(file) {
  const formData = new FormData();
  formData.append('flyer', file);
  return await apiFetch('/event/upload-flyer', {
    method: 'POST',
    body: formData
  });
}

// Participants
export async function registerParticipant(payload) {
  return await apiFetch('/participants/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function addManualParticipant(payload) {
  return await apiFetch('/participants/manual', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function scanParticipantCode(code) {
  return await apiFetch('/participants/scan', {
    method: 'POST',
    body: JSON.stringify({ code })
  });
}

export async function getParticipants(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/participants${query ? `?${query}` : ''}`);
}

export async function getStats() {
  return await apiFetch('/participants/stats');
}

export async function updateParticipant(id, payload) {
  return await apiFetch(`/participants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteParticipant(id) {
  return await apiFetch(`/participants/${id}`, {
    method: 'DELETE'
  });
}

// Settings
export async function getSettings() {
  return await apiFetch('/settings');
}

export async function updateSettings(payload) {
  return await apiFetch('/settings', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function testSheetsWebhook(url) {
  return await apiFetch('/settings/test-sheets', {
    method: 'POST',
    body: JSON.stringify({ url })
  });
}

export async function syncAllSheets() {
  return await apiFetch('/settings/sync-all-sheets', {
    method: 'POST'
  });
}

export async function testSmtp(payload) {
  return await apiFetch('/settings/test-smtp', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

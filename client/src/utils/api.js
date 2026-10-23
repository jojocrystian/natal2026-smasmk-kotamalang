import QRCode from 'qrcode';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export function getSheetsUrl() {
  const local = localStorage.getItem('sheets_api_url');
  if (local && local.trim().startsWith('http')) return local.trim();
  const envSheets = import.meta.env.VITE_SHEETS_API_URL;
  if (envSheets && envSheets.trim().startsWith('http')) return envSheets.trim();
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase && envBase.includes('script.google.com')) return envBase.trim();
  return '';
}

export function setSheetsUrl(url) {
  if (url && url.trim()) {
    localStorage.setItem('sheets_api_url', url.trim());
  } else {
    localStorage.removeItem('sheets_api_url');
  }
}

export function isSheetsMode() {
  const url = getSheetsUrl();
  return Boolean(url && url.includes('script.google.com'));
}

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

// Generate QR Code data URL in-browser
async function attachQrCode(participant) {
  if (!participant || !participant.code) return participant;
  if (!participant.qr_image) {
    try {
      participant.qr_image = await QRCode.toDataURL(participant.code, {
        width: 450,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      participant.qr_data = participant.code;
    } catch (e) {
      console.warn('QR Code generation error:', e);
    }
  }
  return participant;
}

// Google Sheets API caller
async function callSheets(action, payload = {}) {
  const url = getSheetsUrl();
  if (!url) {
    throw new Error('URL Google Spreadsheet belum dihubungkan. Klik menu pengaturan untuk menghubungkan.');
  }

  const res = await fetch(url, {
    method: 'POST',
    // Using text/plain avoids CORS preflight OPTIONS in browsers
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload })
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('Respons dari Google Spreadsheet tidak valid: ' + text.slice(0, 100));
  }

  if (data.error) {
    const err = new Error(data.error);
    err.data = data;
    throw err;
  }

  return data;
}

// Standard REST API caller (for local / Render backend)
export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

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
  if (isSheetsMode()) {
    const data = await callSheets('login', { username, password });
    setToken(data.token);
    setCurrentUser(data.user);
    return data;
  }

  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  setToken(data.token);
  setCurrentUser(data.user);
  return data;
}

export async function fetchMe() {
  if (isSheetsMode()) {
    return { user: getCurrentUser() };
  }
  return await apiFetch('/auth/me');
}

export async function getUsers() {
  if (isSheetsMode()) {
    return await callSheets('getUsers');
  }
  return await apiFetch('/auth/users');
}

export async function createUser(payload) {
  if (isSheetsMode()) {
    return await callSheets('addUser', payload);
  }
  return await apiFetch('/auth/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function deleteUser(id) {
  if (isSheetsMode()) {
    return await callSheets('deleteUser', { id });
  }
  return await apiFetch(`/auth/users/${id}`, {
    method: 'DELETE'
  });
}

// Event Information
export async function getEventInfo() {
  if (isSheetsMode()) {
    return await callSheets('getEvent');
  }
  return await apiFetch('/event');
}

export async function updateEventInfo(payload) {
  if (isSheetsMode()) {
    return await callSheets('updateEvent', payload);
  }
  return await apiFetch('/event', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function uploadFlyer(file) {
  // If in sheets mode, convert flyer to base64 Data URL
  if (isSheetsMode()) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Url = reader.result;
          await callSheets('updateEvent', { flyer_url: base64Url });
          resolve({ flyer_url: base64Url });
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const formData = new FormData();
  formData.append('flyer', file);
  return await apiFetch('/event/upload-flyer', {
    method: 'POST',
    body: formData
  });
}

export async function deleteFlyer() {
  if (isSheetsMode()) {
    return await callSheets('updateEvent', { flyer_url: '' });
  }
  return await apiFetch('/event/flyer', {
    method: 'DELETE'
  });
}

// Participants
export async function registerParticipant(payload) {
  let result;
  if (isSheetsMode()) {
    result = await callSheets('register', payload);
  } else {
    result = await apiFetch('/participants/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
  if (result.participant) {
    result.participant = await attachQrCode(result.participant);
  }
  return result;
}

export async function checkTicket(query) {
  let result;
  const cleanQ = (query || '').trim().toLowerCase();

  if (isSheetsMode()) {
    try {
      result = await callSheets('checkTicket', { query });
    } catch (err) {
      // Automatic fallback if the Google Apps Script deployment has not been updated yet
      if (err.message && (err.message.toLowerCase().includes('tidak dikenali') || err.message.toLowerCase().includes('action'))) {
        const pRes = await callSheets('getParticipants', { search: query });
        const list = pRes.participants || [];
        const found = list.find(p => {
          const email = (p.email || '').toLowerCase().trim();
          const code = (p.code || '').toLowerCase().trim();
          const fullName = (p.full_name || '').toLowerCase().trim();
          const nickname = (p.nickname || '').toLowerCase().trim();
          return email === cleanQ || code === cleanQ || fullName === cleanQ || nickname === cleanQ || (cleanQ.length >= 4 && fullName.includes(cleanQ));
        });

        if (!found) {
          throw new Error('Tiket tidak ditemukan. Pastikan email, kode tiket, atau nama lengkap sama persis saat mendaftar.');
        }

        const evRes = await callSheets('getEvent').catch(() => ({ event: {} }));
        result = {
          success: true,
          participant: found,
          event: evRes.event || {}
        };
      } else {
        throw err;
      }
    }
  } else {
    result = await apiFetch('/participants/check-ticket', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  }

  if (result.participant) {
    result.participant = await attachQrCode(result.participant);
  }
  return result;
}

export async function addManualParticipant(payload) {
  let result;
  if (isSheetsMode()) {
    result = await callSheets('addManual', payload);
  } else {
    result = await apiFetch('/participants/manual', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
  if (result.participant) {
    result.participant = await attachQrCode(result.participant);
  }
  return result;
}

export async function scanParticipantCode(code) {
  let result;
  if (isSheetsMode()) {
    const user = getCurrentUser();
    result = await callSheets('scan', {
      code,
      scanned_by: user ? user.name : 'Panitia Presensi'
    });
  } else {
    result = await apiFetch('/participants/scan', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }
  if (result.participant) {
    result.participant = await attachQrCode(result.participant);
  }
  return result;
}

export async function getParticipants(params = {}) {
  let result;
  if (isSheetsMode()) {
    result = await callSheets('getParticipants', params);
  } else {
    const query = new URLSearchParams(params).toString();
    result = await apiFetch(`/participants${query ? `?${query}` : ''}`);
  }
  if (result.participants) {
    for (let i = 0; i < result.participants.length; i++) {
      result.participants[i] = await attachQrCode(result.participants[i]);
    }
  }
  return result;
}

export async function getStats() {
  if (isSheetsMode()) {
    return await callSheets('getStats');
  }
  return await apiFetch('/participants/stats');
}

export async function updateParticipant(id, payload) {
  if (isSheetsMode()) {
    return await callSheets('updateParticipant', { id, ...payload });
  }
  return await apiFetch(`/participants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteParticipant(id) {
  if (isSheetsMode()) {
    return await callSheets('deleteParticipant', { id });
  }
  return await apiFetch(`/participants/${id}`, {
    method: 'DELETE'
  });
}

export async function toggleAttendance(id, attended) {
  if (isSheetsMode()) {
    const user = getCurrentUser();
    return await callSheets('toggleAttendance', {
      id,
      attended: attended ? 1 : 0,
      scanned_by: user ? user.name : 'Panitia Presensi'
    });
  }
  return await apiFetch(`/participants/${id}/toggle-attendance`, {
    method: 'POST',
    body: JSON.stringify({ attended: attended ? 1 : 0 })
  });
}

export async function resendTicketEmail(id) {
  if (isSheetsMode()) {
    return { success: true, message: 'Fitur email otomatis dijalankan melalui server SMTP.' };
  }
  return await apiFetch(`/participants/${id}/resend-email`, {
    method: 'POST'
  });
}

// Settings
export async function getSettings() {
  if (isSheetsMode()) {
    return {
      settings: {
        google_sheets_webhook_url: getSheetsUrl(),
        smtp_enabled: '0'
      }
    };
  }
  return await apiFetch('/settings');
}

export async function updateSettings(payload) {
  if (payload.google_sheets_webhook_url) {
    setSheetsUrl(payload.google_sheets_webhook_url);
  }
  if (isSheetsMode()) {
    return { message: 'Pengaturan berhasil disimpan!' };
  }
  return await apiFetch('/settings', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function testSheetsWebhook(url) {
  if (url && url.includes('script.google.com')) {
    setSheetsUrl(url);
    return await callSheets('test');
  }
  return await apiFetch('/settings/test-sheets', {
    method: 'POST',
    body: JSON.stringify({ url })
  });
}

export async function syncAllSheets() {
  if (isSheetsMode()) {
    return { success: true, message: 'Mode Spreadsheet aktif: data tersimpan langsung di Google Sheet!' };
  }
  return await apiFetch('/settings/sync-all-sheets', {
    method: 'POST'
  });
}

export async function testSmtp(payload) {
  if (isSheetsMode()) {
    return { success: true, message: 'SMTP dinonaktifkan dalam mode Spreadsheet.' };
  }
  return await apiFetch('/settings/test-smtp', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

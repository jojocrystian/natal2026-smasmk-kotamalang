import QRCode from 'qrcode';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxK2MPG-0HsnUJXKGX0S6yAlfOrFz4DVUJsG_buZQ8YxMAo1AqPiNn8TvxY0wcLOogD/exec';

export function getSheetsUrl() {
  const local = localStorage.getItem('sheets_api_url');
  if (local && local.trim().startsWith('http')) return local.trim();
  const envSheets = import.meta.env.VITE_SHEETS_API_URL;
  if (envSheets && envSheets.trim().startsWith('http')) return envSheets.trim();
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase && envBase.includes('script.google.com')) return envBase.trim();
  return DEFAULT_SHEETS_URL;
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

// Helper to encode registration status and quota into description as universal cloud metadata
export function attachEventMeta(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const meta = {
    registration_status: payload.registration_status || 'open',
    quota: payload.quota !== undefined && payload.quota !== null ? Number(payload.quota) : 500
  };
  
  // Clean existing META tags from description
  let cleanDesc = (payload.description || '').replace(/\s*<!--META:.*?-->\s*/g, '').trim();
  const metaTag = `\n<!--META:${JSON.stringify(meta)}-->`;
  
  return {
    ...payload,
    description: cleanDesc + metaTag
  };
}

// Helper to parse registration status and quota from event object or meta tag or local storage
export function parseEventMeta(event) {
  if (!event || typeof event !== 'object') return event;
  
  let regStatus = event.registration_status;
  let quota = event.quota;

  // 1. Try to extract from description <!--META:...-->
  let metaStatus = null;
  let metaQuota = null;
  if (event.description && typeof event.description === 'string' && event.description.includes('<!--META:')) {
    try {
      const match = event.description.match(/<!--META:(.*?)-->/);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        if (parsed.registration_status) {
          metaStatus = parsed.registration_status;
        }
        if (parsed.quota !== undefined && parsed.quota !== null) {
          metaQuota = Number(parsed.quota);
        }
      }
    } catch (e) {
      console.warn('Error parsing event meta tag:', e);
    }
  }

  // Strip meta tag so UI always displays clean description
  event.clean_description = (event.description || '').replace(/\s*<!--META:.*?-->\s*/g, '').trim();
  event.description = event.clean_description;

  // 2. Resolve Status: meta tag (cloud truth) > explicit server status > local storage > 'open'
  const localStatus = localStorage.getItem('app_registration_status');
  if (metaStatus) {
    regStatus = metaStatus;
  } else if (!regStatus && localStatus) {
    regStatus = localStatus;
  }
  regStatus = regStatus || 'open';
  try { localStorage.setItem('app_registration_status', regStatus); } catch {}

  // 3. Resolve Quota: meta tag (cloud truth) > server quota > local storage > 500
  const localQuota = localStorage.getItem('app_quota');
  if (metaQuota !== null && !isNaN(metaQuota)) {
    quota = metaQuota;
  } else if ((quota === undefined || quota === null || isNaN(Number(quota))) && localQuota) {
    quota = Number(localQuota);
  }
  quota = quota !== undefined && quota !== null && !isNaN(Number(quota)) ? Number(quota) : 500;
  try { localStorage.setItem('app_quota', String(quota)); } catch {}

  // 4. Resolve Registered Count: real count from participants > local count > 0
  const localRegisteredCount = localStorage.getItem('app_registered_count');
  if (event.registered_count !== undefined && event.registered_count !== null && !isNaN(Number(event.registered_count))) {
    const countNum = Number(event.registered_count);
    if (countNum === 0 && localRegisteredCount && Number(localRegisteredCount) > 0) {
      event.registered_count = Number(localRegisteredCount);
    } else {
      event.registered_count = countNum;
      try { localStorage.setItem('app_registered_count', String(countNum)); } catch {}
    }
  } else if (localRegisteredCount && !isNaN(Number(localRegisteredCount))) {
    event.registered_count = Number(localRegisteredCount);
  } else {
    event.registered_count = 0;
  }

  event.registration_status = regStatus;
  event.quota = quota;
  return event;
}

// Event Information & Realtime Cross-Page Synchronization
export function broadcastEventUpdate(eventObj) {
  try {
    if (eventObj) {
      const parsed = parseEventMeta({ ...eventObj });
      if (parsed.registration_status) {
        localStorage.setItem('app_registration_status', parsed.registration_status);
      }
      if (parsed.quota !== undefined && parsed.quota !== null) {
        localStorage.setItem('app_quota', String(parsed.quota));
      }
      if (parsed.registered_count !== undefined && parsed.registered_count !== null) {
        localStorage.setItem('app_registered_count', String(parsed.registered_count));
      }
      localStorage.setItem('cached_event_info', JSON.stringify(parsed));
      localStorage.setItem('event_info_last_updated', Date.now().toString());
      window.dispatchEvent(new CustomEvent('event_info_updated', { detail: parsed }));
    }
  } catch (e) {
    console.warn('Event broadcast error:', e);
  }
}

export function getCachedEventInfo() {
  try {
    const raw = localStorage.getItem('cached_event_info');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parseEventMeta(parsed);
  } catch {
    return null;
  }
}

export async function getEventInfo() {
  let data;
  if (isSheetsMode()) {
    data = await callSheets('getEvent');
    // Ensure real live participant count from sheet "Peserta"
    try {
      const pRes = await callSheets('getParticipants');
      const liveCount = (pRes && Array.isArray(pRes.participants)) 
        ? pRes.participants.length 
        : (pRes?.totalCount !== undefined ? Number(pRes.totalCount) : null);
      if (liveCount !== null && !isNaN(liveCount)) {
        if (!data.event) data.event = {};
        data.event.registered_count = liveCount;
      }
    } catch (pe) {
      try {
        const statsRes = await callSheets('getStats');
        const total = statsRes?.total !== undefined ? statsRes.total : (statsRes?.stats?.total);
        if (total !== undefined && !isNaN(Number(total))) {
          if (!data.event) data.event = {};
          data.event.registered_count = Number(total);
        }
      } catch (se) {}
    }
  } else {
    data = await apiFetch('/event');
  }
  if (data?.event) {
    data.event = parseEventMeta(data.event);
    broadcastEventUpdate(data.event);
  }
  return data;
}

export async function updateEventInfo(payload) {
  const preparedPayload = attachEventMeta(payload);
  if (preparedPayload.registration_status) {
    try { localStorage.setItem('app_registration_status', preparedPayload.registration_status); } catch {}
  }
  if (preparedPayload.quota !== undefined) {
    try { localStorage.setItem('app_quota', String(preparedPayload.quota)); } catch {}
  }

  let res;
  if (isSheetsMode()) {
    res = await callSheets('updateEvent', preparedPayload);
  } else {
    res = await apiFetch('/event', {
      method: 'PUT',
      body: JSON.stringify(preparedPayload)
    });
  }

  const finalEvent = parseEventMeta(res?.event || preparedPayload);
  broadcastEventUpdate(finalEvent);
  return { ...res, event: finalEvent };
}

export async function uploadFlyer(file) {
  // If in sheets mode, convert flyer to base64 Data URL
  if (isSheetsMode()) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Url = reader.result;
          const res = await callSheets('updateEvent', { flyer_url: base64Url });
          if (res?.event) broadcastEventUpdate(res.event);
          resolve({ flyer_url: base64Url, event: res?.event });
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
  const res = await apiFetch('/event/upload-flyer', {
    method: 'POST',
    body: formData
  });

  // Re-fetch latest event and broadcast
  const fresh = await getEventInfo().catch(() => null);
  if (fresh?.event) {
    broadcastEventUpdate(fresh.event);
  }
  return res;
}

export async function deleteFlyer() {
  let res;
  if (isSheetsMode()) {
    res = await callSheets('updateEvent', { flyer_url: '' });
  } else {
    res = await apiFetch('/event/flyer', {
      method: 'DELETE'
    });
  }
  const fresh = await getEventInfo().catch(() => null);
  if (fresh?.event) {
    broadcastEventUpdate(fresh.event);
  }
  return res;
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

    // Immediately update and broadcast new participant count!
    const currentEvent = getCachedEventInfo() || {};
    const updatedCount = Number(
      result.registered_count !== undefined 
        ? result.registered_count 
        : (result.event?.registered_count !== undefined 
            ? result.event.registered_count 
            : (Number(currentEvent.registered_count || 0) + 1))
    );
    const updatedEvent = {
      ...currentEvent,
      ...(result.event || {}),
      registered_count: updatedCount
    };
    broadcastEventUpdate(updatedEvent);
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

    // Immediately update and broadcast new participant count!
    const currentEvent = getCachedEventInfo() || {};
    const updatedCount = Number(
      result.registered_count !== undefined 
        ? result.registered_count 
        : (result.event?.registered_count !== undefined 
            ? result.event.registered_count 
            : (Number(currentEvent.registered_count || 0) + 1))
    );
    const updatedEvent = {
      ...currentEvent,
      ...(result.event || {}),
      registered_count: updatedCount
    };
    broadcastEventUpdate(updatedEvent);
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
  let res;
  if (isSheetsMode()) {
    res = await callSheets('deleteParticipant', { id });
  } else {
    res = await apiFetch(`/participants/${id}`, {
      method: 'DELETE'
    });
  }
  const currentEvent = getCachedEventInfo() || {};
  const updatedCount = Number(
    res?.registered_count !== undefined 
      ? res.registered_count 
      : Math.max(0, Number(currentEvent.registered_count || 1) - 1)
  );
  broadcastEventUpdate({
    ...currentEvent,
    registered_count: updatedCount
  });
  return res;
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

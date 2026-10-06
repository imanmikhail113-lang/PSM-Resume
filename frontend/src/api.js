export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
let csrfToken = '';
export function rememberSession(data) {
  csrfToken = data.csrf_token || '';
  localStorage.setItem('user_email', data.email || '');
  localStorage.setItem('user_username', data.username?.replace(/-[a-f0-9]{10}$/, '') || '');
}
export async function apiFetch(url, options = {}) {
  const response = await fetch(url, { ...options, credentials: 'include', headers: { ...options.headers, ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) } });
  if (response.status === 401 && !url.includes('/auth/')) window.dispatchEvent(new Event('session-expired'));
  return response;
}
export async function authRequest(path, options) {
  let response;
  try { response = await apiFetch(`${API_BASE_URL}/api/auth/${path}`, { signal: AbortSignal.timeout(15000), ...options }); }
  catch { throw new Error('Unable to reach your workspace. Check your connection and try again.'); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to connect. Please try again.');
  if (data.csrf_token) csrfToken = data.csrf_token;
  return data;
}

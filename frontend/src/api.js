// All API calls share the frontend origin so session cookies work reliably.
// Vite proxies local requests; the deployment host supplies the production proxy.
export const API_BASE_URL = '';
let csrfToken = '';

export class WorkspaceError extends Error {
  constructor(message, code, status = 0) {
    super(message);
    this.name = 'WorkspaceError';
    this.code = code;
    this.status = status;
  }
}

export function rememberSession(data) {
  csrfToken = data.csrf_token || '';
  localStorage.setItem('user_email', data.email || '');
  localStorage.setItem('user_username', data.username?.replace(/-[a-f0-9]{10}$/, '') || '');
}

export async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers);
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  const response = await fetch(url, { ...options, credentials: 'include', headers });
  if (response.status === 401 && !url.includes('/auth/')) {
    window.dispatchEvent(new Event('session-expired'));
  }
  return response;
}

export async function authRequest(path, options = {}) {
  const { onRetry, ...requestOptions } = options;
  // Configuration reads have longer patience to allow cloud cold-starts.
  const attempts = path === 'config' ? 3 : 1;
  const timeoutMs = path === 'config' ? 45000 : 25000;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let response;
    try {
      response = await apiFetch(`${API_BASE_URL}/api/auth/${path}`, {
        ...requestOptions,
        signal: requestOptions.signal || AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error?.name === 'TimeoutError' || requestOptions.signal?.aborted) {
        if (attempt + 1 < attempts) { onRetry?.(); continue; }
        throw new WorkspaceError('The workspace is starting up. Cloud servers may need a moment to wake up.', 'connection');
      }
      if (attempt + 1 < attempts) { onRetry?.(); continue; }
      throw new WorkspaceError('The workspace is taking longer to respond. Please try again in a moment.', 'connection');
    }
    if ([502, 503, 504].includes(response.status) && attempt + 1 < attempts) {
      onRetry?.();
      await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    if (response.status === 404) {
      throw new WorkspaceError('The workspace needs an update before sign-in is available.', 'deployment', 404);
    }
    let data;
    try { data = await response.json(); }
    catch { throw new WorkspaceError('The workspace returned an unexpected response. Please try again shortly.', 'response', response.status); }
    if (!response.ok) {
      throw new WorkspaceError(data.message || 'The workspace is temporarily unavailable. Please try again shortly.', 'request', response.status);
    }
    if (path === 'config' && (!data.csrf_token || !data.nonce)) {
      throw new WorkspaceError('The workspace needs an update before sign-in is available.', 'deployment');
    }
    if (data.csrf_token) csrfToken = data.csrf_token;
    return data;
  }
}

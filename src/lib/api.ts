const API_URL = import.meta.env.VITE_API_URL;

/** Broadcast when the API rejects our token, so AuthContext can clear the session. */
export const SESSION_EXPIRED_EVENT = 'trakr:session-expired';

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

/**
 * `fetch` for authenticated endpoints, with the stored bearer token attached.
 *
 * Tokens expire, so any call can come back 401 mid-session. Handling it here
 * means callers never have to distinguish "request failed" from "you are no
 * longer logged in", and the UI can't get stuck showing a signed-in shell that
 * silently fails every request.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');

  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new SessionExpiredError();
  }

  return res;
}

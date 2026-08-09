import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { SESSION_EXPIRED_EVENT } from '../lib/api';

interface AuthUser {
  id: number;
  username: string;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  login: (newToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Read the user out of the JWT payload. Returns null for a malformed *or*
 * expired token — the server would reject it either way, so treating it as
 * "logged out" here avoids rendering a signed-in UI backed by a dead token.
 */
function decodeUser(token: string | null): AuthUser | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const { id, username, exp } = JSON.parse(json);

    if (typeof exp === 'number' && exp * 1000 <= Date.now()) return null;
    if (typeof id !== 'number' || typeof username !== 'string') return null;

    return { id, username };
  } catch {
    return null;
  }
}

function readStoredToken(): string | null {
  const stored = localStorage.getItem('token');
  if (stored && !decodeUser(stored)) {
    localStorage.removeItem('token');
    return null;
  }
  return stored;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState(readStoredToken);
  const user = useMemo(() => decodeUser(token), [token]);

  // A token can also expire while the tab is open; apiFetch announces the
  // first 401 it sees so the session clears without a reload.
  useEffect(() => {
    const handleExpired = () => setToken(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext) as AuthContextValue;

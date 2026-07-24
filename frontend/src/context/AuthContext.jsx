import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/auth/me').then(r => setUser(r.data.user ?? null)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    return data.user;
  }
  async function register(payload) {
    const { data } = await api.post('/auth/register', payload);
    setUser(data.user);
    return data.user;
  }
  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
  }
  return <AuthContext.Provider value={{ user, loading, login, register, logout, setCurrentUser: setUser }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);

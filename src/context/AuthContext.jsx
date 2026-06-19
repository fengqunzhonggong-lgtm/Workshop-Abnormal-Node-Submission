import { createContext, useContext, useState } from 'react';
import api from '../api';
import { setToken, clearToken } from '../api/tokenStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (employee_id, password) => {
    const res = await api.post('/auth/login', { employee_id, password });
    const { token, user: userData } = res.data;
    setToken(token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

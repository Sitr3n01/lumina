import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignorar erro de rede no logout — limpar estado local de qualquer forma
    }
    localStorage.removeItem('lumina_token');
    setUser(null);
  }, []);

  // Validar token existente ao montar o contexto
  useEffect(() => {
    const token = localStorage.getItem('lumina_token');
    if (!token) {
      setLoading(false);
      return;
    }

    authAPI.getMe()
      .then((userData) => setUser(userData))
      .catch(() => {
        localStorage.removeItem('lumina_token');
      })
      .finally(() => setLoading(false));
  }, []);

  // Escutar evento de logout disparado pelo interceptor 401 do api.js
  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await authAPI.login(credentials);
    localStorage.setItem('lumina_token', response.access_token);
    setUser(response.user);
    return response;
  }, []);

  const register = useCallback(async (userData) => {
    const response = await authAPI.register(userData);
    // Após registro, fazer login automaticamente
    const loginResp = await authAPI.login({
      username: userData.username,
      password: userData.password,
    });
    localStorage.setItem('lumina_token', loginResp.access_token);
    setUser(loginResp.user);
    return response;
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};

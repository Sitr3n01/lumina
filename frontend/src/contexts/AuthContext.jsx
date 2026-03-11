import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

/** Retorna localStorage ou sessionStorage conforme preferência do usuário */
const getTokenStorage = () =>
  localStorage.getItem('lumina_remember_login') === 'false'
    ? sessionStorage
    : localStorage;

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
    sessionStorage.removeItem('lumina_token');
    setUser(null);
  }, []);

  // Validar token existente ao montar o contexto
  useEffect(() => {
    const existingToken = localStorage.getItem('lumina_token') || sessionStorage.getItem('lumina_token');

    if (existingToken) {
      // Token de sessão anterior — validar imediatamente (backend já pronto)
      authAPI.getMe()
        .then((userData) => setUser(userData))
        .catch(() => {
          localStorage.removeItem('lumina_token');
          sessionStorage.removeItem('lumina_token');
        })
        .finally(() => setLoading(false));
      return;
    }

    // Sem token salvo — tentar auto-login pós-wizard via Electron IPC
    if (!window.electronAPI?.getAutoLoginToken) {
      // Modo web / sem Electron: não há auto-login
      setLoading(false);
      return;
    }

    // Chamada direta ao IPC — sem depender do evento backend:ready.
    // O handler 'auth:getAutoLoginToken' é registrado em main.js ANTES de loadFile(),
    // portanto está disponível quando este useEffect executa (pós-render).
    // O evento backend:ready sofria race condition: era enviado em did-finish-load
    // (que dispara durante/antes do render) antes do listener ser registrado aqui.
    (async () => {
      try {
        const autoToken = await window.electronAPI.getAutoLoginToken();
        if (autoToken) {
          getTokenStorage().setItem('lumina_token', autoToken);
          const userData = await authAPI.getMe();
          setUser(userData);
        }
      } catch (e) {
        console.error('[AuthContext] Auto-login pós-wizard falhou:', e);
        localStorage.removeItem('lumina_token');
        sessionStorage.removeItem('lumina_token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Escutar evento de logout disparado pelo interceptor 401 do api.js
  useEffect(() => {
    const handleForcedLogout = () => {
      localStorage.removeItem('lumina_token');
      sessionStorage.removeItem('lumina_token');
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await authAPI.login(credentials);
    getTokenStorage().setItem('lumina_token', response.access_token);
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
    getTokenStorage().setItem('lumina_token', loginResp.access_token);
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

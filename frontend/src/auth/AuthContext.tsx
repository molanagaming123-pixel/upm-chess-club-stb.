import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, configureClient, Member } from '../api';
import { clearToken, loadToken, saveToken } from './storage';

interface AuthValue {
  user: Member | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; nim?: string | null }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  const reset = useCallback(async () => {
    tokenRef.current = null;
    setUser(null);
    await clearToken();
  }, []);

  useEffect(() => {
    configureClient({
      getToken: () => tokenRef.current,
      onUnauthorized: () => {
        void reset();
      },
    });
    (async () => {
      const saved = await loadToken();
      if (saved) {
        tokenRef.current = saved;
        try {
          setUser(await api.me());
        } catch {
          await reset();
        }
      }
      setLoading(false);
    })();
  }, [reset]);

  const startSession = useCallback(async (token: string, u: Member) => {
    tokenRef.current = token;
    await saveToken(token);
    setUser(u);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email.trim(), password);
      await startSession(res.access_token, res.user);
    },
    [startSession],
  );

  const register = useCallback(
    async (data: { name: string; email: string; password: string; nim?: string | null }) => {
      const res = await api.register(data);
      await startSession(res.access_token, res.user);
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // logout sisi klien tetap dilanjutkan walau server tidak terjangkau
    }
    await reset();
  }, [reset]);

  const refreshUser = useCallback(async () => {
    setUser(await api.me());
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, loading, isAdmin: user?.role === 'admin', login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, setAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  demoAccounts: User[];
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState<User[]>([]);

  const loadInitialAuth = async () => {
    try {
      // Load demo accounts list for role-switching convenience
      const demoRes = await api.getDemoAccounts();
      setDemoAccounts(demoRes.users);

      const token = localStorage.getItem('poratha_auth_token');
      if (token) {
        const meRes = await api.getMe();
        setUser(meRes.user);
      } else {
        // Auto-login as Super Admin or Head Office for immediate interactive exploration
        if (demoRes.users.length > 0) {
          const defaultUser = demoRes.users.find((u) => u.role === UserRole.HEAD_OFFICE_ADMIN) || demoRes.users[0];
          const switchRes = await api.switchDemoUser(defaultUser.id);
          setAuthToken(switchRes.token);
          setUser(switchRes.user);
        }
      }
    } catch (err) {
      console.warn('Auth init note:', err);
      // Fallback: switch to first demo user
      try {
        const demoRes = await api.getDemoAccounts();
        if (demoRes.users.length > 0) {
          const defaultUser = demoRes.users[0];
          const switchRes = await api.switchDemoUser(defaultUser.id);
          setAuthToken(switchRes.token);
          setUser(switchRes.user);
        }
      } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialAuth();

    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, pass);
      setAuthToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  const switchUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const res = await api.switchDemoUser(userId);
      setAuthToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const meRes = await api.getMe();
      setUser(meRes.user);
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        switchUser,
        demoAccounts,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

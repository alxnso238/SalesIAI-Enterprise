import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './auth-context';
import type { AuthUser } from './auth-context';
import { apiRequest, apiRoutes } from '../services/api';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('salesia_token');
    const email = localStorage.getItem('salesia_email');
    if (!token || !email) return null;
    return {
      email,
      name: localStorage.getItem('salesia_name') || email,
      token,
      role: localStorage.getItem('salesia_role') || 'viewer',
    };
  });
  const token = user?.token;

  useEffect(() => {
    if (!token) return;
    let active = true;
    void apiRequest<{ email: string; name: string; role: string }>(apiRoutes.auth.me)
      .then((profile) => {
        if (!active) return;
        localStorage.setItem('salesia_role', profile.role);
        localStorage.setItem('salesia_name', profile.name);
        setUser((current) => current ? { ...current, ...profile } : current);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [token]);

  const login = (email: string, token: string, role = 'member', name = email) => {
    localStorage.setItem('salesia_token', token);
    localStorage.setItem('salesia_email', email);
    localStorage.setItem('salesia_role', role);
    localStorage.setItem('salesia_name', name);
    setUser({ email, name, role, token });
  };

  const logout = () => {
    localStorage.removeItem('salesia_token');
    localStorage.removeItem('salesia_email');
    localStorage.removeItem('salesia_role');
    localStorage.removeItem('salesia_name');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
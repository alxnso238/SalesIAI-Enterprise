import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './auth-context';
import type { AuthUser } from './auth-context';
import { apiRequest, apiRoutes } from '../services/api';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('matrixflow_token');
    const email = localStorage.getItem('matrixflow_email');
    if (!token || !email) return null;
    return {
      email,
      name: localStorage.getItem('matrixflow_name') || email,
      token,
      role: localStorage.getItem('matrixflow_role') || 'viewer',
    };
  });
  const token = user?.token;

  useEffect(() => {
    if (!token) return;
    let active = true;
    void apiRequest<{ email: string; name: string; role: string }>(apiRoutes.auth.me)
      .then((profile) => {
        if (!active) return;
        localStorage.setItem('matrixflow_role', profile.role);
        localStorage.setItem('matrixflow_name', profile.name);
        setUser((current) => current ? { ...current, ...profile } : current);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [token]);

  const login = (email: string, token: string, role = 'member', name = email) => {
    localStorage.setItem('matrixflow_token', token);
    localStorage.setItem('matrixflow_email', email);
    localStorage.setItem('matrixflow_role', role);
    localStorage.setItem('matrixflow_name', name);
    setUser({ email, name, role, token });
  };

  const logout = () => {
    localStorage.removeItem('matrixflow_token');
    localStorage.removeItem('matrixflow_email');
    localStorage.removeItem('matrixflow_role');
    localStorage.removeItem('matrixflow_name');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
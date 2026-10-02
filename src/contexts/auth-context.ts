import { createContext } from 'react';

export interface AuthUser {
  email: string;
  name: string;
  role: string;
  token: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, token: string, role?: string, name?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
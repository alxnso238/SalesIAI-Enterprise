import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/reports-page';
import { UsersPage } from './pages/users-page';
import { HistoryPage } from './pages/history-page';
import { SalesPage } from './pages/SalesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import './App.css';

// Componente para proteger las rutas privadas del Dashboard
const ProtectedLayout: React.FC = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <AppLayout />;
};

const RoleRoute: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const allRoles = ['admin', 'member', 'analyst', 'viewer'];
const businessRoles = ['admin', 'member'];

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 1. EL HOME ES LA VISTA PRINCIPAL (RAÍZ) */}
          <Route path="/" element={<HomePage />} />

          {/* 2. PÁGINA DE AUTENTICACIÓN (LOGIN / REGISTRO) */}
          <Route path="/login" element={<LoginPage />} />

          {/* 3. SISTEMA PRINCIPAL / DASHBOARD PROTEGIDO */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/ventas" element={<RoleRoute roles={businessRoles}><SalesPage /></RoleRoute>} />
            <Route path="/analytics" element={<RoleRoute roles={allRoles}><AnalyticsPage /></RoleRoute>} />
            <Route path="/datasets" element={<RoleRoute roles={['admin', 'analyst']}><PlaceholderPage /></RoleRoute>} />
            <Route path="/dataset-variables" element={<RoleRoute roles={['admin', 'analyst']}><PlaceholderPage /></RoleRoute>} />
            <Route path="/observations" element={<RoleRoute roles={['admin', 'analyst']}><PlaceholderPage /></RoleRoute>} />
            <Route path="/inventario" element={<RoleRoute roles={businessRoles}><PlaceholderPage /></RoleRoute>} />
            <Route path="/empresa" element={<RoleRoute roles={allRoles}><PlaceholderPage /></RoleRoute>} />
            <Route path="/sucursales" element={<RoleRoute roles={allRoles}><PlaceholderPage /></RoleRoute>} />
            <Route path="/clientes" element={<RoleRoute roles={allRoles}><PlaceholderPage /></RoleRoute>} />
            <Route path="/vendedores" element={<RoleRoute roles={allRoles}><PlaceholderPage /></RoleRoute>} />
            <Route path="/productos" element={<RoleRoute roles={allRoles}><PlaceholderPage /></RoleRoute>} />
            <Route path="/categorias" element={<RoleRoute roles={allRoles}><PlaceholderPage /></RoleRoute>} />
            <Route path="/metas" element={<RoleRoute roles={['admin']}><PlaceholderPage /></RoleRoute>} />
            <Route path="/reportes" element={<RoleRoute roles={allRoles}><ReportsPage /></RoleRoute>} />
            <Route path="/usuarios" element={<RoleRoute roles={['admin']}><UsersPage /></RoleRoute>} />
            <Route path="/historial" element={<RoleRoute roles={['admin']}><HistoryPage /></RoleRoute>} />
            <Route path="/configuracion" element={<RoleRoute roles={['admin']}><PlaceholderPage /></RoleRoute>} />
            <Route path="*" element={<PlaceholderPage />} />
          </Route>

          {/* Comodín por si escriben cualquier otra ruta */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
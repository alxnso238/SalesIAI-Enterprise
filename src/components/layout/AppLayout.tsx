import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { apiRequest, apiRoutes } from '../../services/api'
import './nav.css'

type NavigationItem = { label: string; path: string; icon: string; adminOnly?: boolean }

const mainNavigation: NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '▦' },
  { label: 'Ventas', path: '/ventas', icon: '↗' },
  { label: 'Inventario', path: '/inventario', icon: '▤' },
]

const companyNavigation: NavigationItem[] = [
  { label: 'Sucursales', path: '/sucursales', icon: '⌗' },
  { label: 'Productos', path: '/productos', icon: '□' },
  { label: 'Metas', path: '/metas', icon: '◎', adminOnly: true },
]

const analysisNavigation: NavigationItem[] = [
  { label: 'Vectores', path: '/vectores', icon: '◇' },
  { label: 'Matrices', path: '/matrices', icon: '▧' },
  { label: 'Operaciones', path: '/operaciones', icon: '∑' },
  { label: 'Combinaciones lineales', path: '/combinaciones-lineales', icon: '⌁' },
]

function NavigationLink({ item, nested = false }: { item: NavigationItem; nested?: boolean }) {
  return <NavLink to={item.path} className={({ isActive }) => `nav-item ${nested ? 'nav-item-nested' : ''} ${isActive ? 'active' : ''}`}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></NavLink>
}

function NavigationGroup({ label, icon, items, initialOpen, collapsed, isAdmin = false }: { label: string; icon: string; items: NavigationItem[]; initialOpen: boolean; collapsed: boolean; isAdmin?: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  const visibleItems = items.filter((item) => !item.adminOnly || isAdmin)

  return <div className={`nav-group ${open ? 'open' : ''}`}>
    <button className="nav-group-trigger" type="button" onClick={() => setOpen((isOpen) => !isOpen)} aria-expanded={open} title={collapsed ? label : undefined}>
      <span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span><b aria-hidden="true">⌄</b>
    </button>
    {open && !collapsed && <div className="nav-group-items" aria-label={label}>{visibleItems.map((item) => <NavigationLink key={item.path} item={item} nested />)}</div>}
  </div>
}

export function AppLayout() {
  const location = useLocation()
  const { logout, user } = useAuth()
  const [apiStatus, setApiStatus] = useState('Verificando API')
  const [companyName, setCompanyName] = useState('Sin empresa')
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('matrixflow|sidebar') !== 'closed'
  })
  const companyActive = companyNavigation.some((item) => location.pathname === item.path)
  const analysisActive = analysisNavigation.some((item) => location.pathname === item.path)
  const role = user?.role ?? 'viewer'
  const isAdmin = role === 'admin'
  const canOperateBusiness = isAdmin || role === 'member'
  const canAnalyze = isAdmin || role === 'member' || role === 'analyst'
  const visibleMainNavigation = mainNavigation.filter((item) =>
    item.path === '/dashboard' || (canOperateBusiness && ['/ventas', '/inventario'].includes(item.path)),
  )
  useEffect(() => {
    let active = true
    void apiRequest<{ status: string; database: string }>(apiRoutes.ready)
      .then(() => { if (active) setApiStatus('API conectada') })
      .catch(() => { if (active) setApiStatus('API sin conexión') })
    void apiRequest<{ name?: string }[]>(`${apiRoutes.resources}/companies`)
      .then((companies) => {
        if (active) setCompanyName(companies[0]?.name ?? 'Sin empresa')
      })
      .catch(() => { if (active) setCompanyName('Sin empresa') })
    return () => { active = false }
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen((open) => {
      localStorage.setItem('matrixflow|sidebar', open ? 'closed' : 'open')
      return !open
    })
  }

  return <div className={`app-shell ${sidebarOpen ? '' : 'sidebar-collapsed'} ${location.pathname === '/dashboard' ? 'dashboard-theme' : ''} ${location.pathname === '/ventas' ? 'sales-theme' : ''}`}>
    <header className="topbar">
      <button className="sidebar-toggle" type="button" onClick={toggleSidebar} aria-label="Mostrar u ocultar menú">☰</button>
      <NavLink className="topbar-brand" to="/dashboard"><span className="brand-mark">M</span><span>MatrixFlow <b>Enterprise</b></span></NavLink>
      <div className="topbar-search"><span>⌕</span><input aria-label="Buscar" placeholder="Buscar en MatrixFlow..." /><kbd>⌘ K</kbd></div>
      
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button className="topbar-icon" aria-label="Notificaciones">♢<i /></button>
        
        {/* Menú de usuario original */}
        <button className="user-menu" aria-label="Abrir menú de usuario" type="button">
          <span className="avatar">{user?.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() ?? 'MF'}</span>
          <span className="user-summary"><b>{user?.name ?? 'Usuario'}</b><small>{user?.email ?? 'Cuenta'}</small></span>
          <span>⌄</span>
        </button>

        {/* Botón de cerrar sesión ubicado de forma limpia al lado */}
        <button 
          onClick={logout} 
          type="button"
          title="Cerrar sesión"
          style={{
            padding: '0.4rem 0.75rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Cerrar Sesion
        </button>
      </div>
    </header>

    <aside className="sidebar">
      <div className="sidebar-workspace"><span className="eyebrow">ESPACIO DE TRABAJO</span><strong>{companyName}</strong><span>⌄</span></div>
      <nav className="navigation" aria-label="Navegación principal">
        <span className="nav-label">PRINCIPAL</span>
        {visibleMainNavigation.map((item) => <NavigationLink key={item.path} item={item} />)}
        <><span className="nav-label">EMPRESA</span><NavigationGroup key={location.pathname} label="Empresa" icon="⌂" items={companyNavigation} initialOpen={companyActive} collapsed={!sidebarOpen} isAdmin={isAdmin} /></>
        {canAnalyze && <><span className="nav-label">ANÁLISIS MATEMÁTICO</span><NavigationGroup key={location.pathname} label="Análisis matemático" icon="∑" items={analysisNavigation} initialOpen={analysisActive} collapsed={!sidebarOpen} /></>}
        <span className="nav-label">SISTEMA</span>
        {isAdmin && <NavigationLink item={{ label: 'Auditoría', path: '/historial', icon: '◷' }} />}
        <NavigationLink item={{ label: 'Reportes', path: '/reportes', icon: '▥' }} />
        {isAdmin && <><NavigationLink item={{ label: 'Usuarios', path: '/usuarios', icon: '♙' }} /><NavigationLink item={{ label: 'Configuración', path: '/configuracion', icon: '⚙' }} /></>}
      </nav>
      <div className="sidebar-footer"><div className={`sidebar-status ${apiStatus === 'API conectada' ? 'connected' : 'disconnected'}`}><i /> {apiStatus}</div><small>MatrixFlow Enterprise<br />PostgreSQL · Supabase</small></div>
    </aside>

    <main className="main-content"><div className="page-content"><Outlet /></div><footer className="app-footer"><span>© 2026 MatrixFlow Enterprise</span><span>{apiStatus}</span></footer></main>
  </div>
}
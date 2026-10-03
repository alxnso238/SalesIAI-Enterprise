import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { apiRequest, apiRoutes } from '../../services/api'
import { dashboardModules, type DashboardModuleId } from '../../modules/dashboard/components/DashboardModuleTabs'
import './nav.css'

type NavigationItem = { label: string; path: string; icon: string; adminOnly?: boolean; analyticsOnly?: boolean }

const mainNavigation: NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '▦' },
  { label: 'Ventas', path: '/ventas', icon: '↗' },
  { label: 'Analytics', path: '/analytics', icon: '∿' },
  { label: 'Datasets', path: '/datasets', icon: '▤', analyticsOnly: true },
  { label: 'Variables', path: '/dataset-variables', icon: '⌁', analyticsOnly: true },
  { label: 'Observaciones', path: '/observations', icon: '◷', analyticsOnly: true },
  { label: 'Inventario', path: '/inventario', icon: '▤' },
]

const companyNavigation: NavigationItem[] = [
  { label: 'Sucursales', path: '/sucursales', icon: '⌗' },
  { label: 'Clientes', path: '/clientes', icon: '♙' },
  { label: 'Vendedores', path: '/vendedores', icon: '♧' },
  { label: 'Productos', path: '/productos', icon: '□' },
  { label: 'Metas', path: '/metas', icon: '◎', adminOnly: true },
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
    return localStorage.getItem('salesia|sidebar') !== 'closed'
  })
  const [activeDashboardModule, setActiveDashboardModule] = useState<DashboardModuleId>('resumen')
  const companyActive = companyNavigation.some((item) => location.pathname === item.path)
  const role = user?.role ?? 'viewer'
  const isAdmin = role === 'admin'
  const canManageAnalytics = isAdmin || role === 'analyst'
  const canOperateBusiness = isAdmin || role === 'member'
  const visibleMainNavigation = mainNavigation.filter((item) => {
    if (!user) return false
    if (item.path === '/dashboard') return true
    return item.path === '/analytics' || (item.analyticsOnly && canManageAnalytics) || (canOperateBusiness && ['/ventas', '/inventario'].includes(item.path))
  })
  useEffect(() => {
    if (!user?.token) {
      setApiStatus('Demo frontend')
      setCompanyName('SalesIA Demo')
      return
    }
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
  }, [user?.token])

  useEffect(() => {
    const updateActiveModule = (event: Event) => {
      const moduleId = (event as CustomEvent<DashboardModuleId>).detail
      if (dashboardModules.some((module) => module.id === moduleId)) setActiveDashboardModule(moduleId)
    }
    window.addEventListener('salesia-dashboard-module', updateActiveModule)
    return () => window.removeEventListener('salesia-dashboard-module', updateActiveModule)
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen((open) => {
      localStorage.setItem('salesia|sidebar', open ? 'closed' : 'open')
      return !open
    })
  }

  return <div className={`app-shell ${sidebarOpen ? '' : 'sidebar-collapsed'} ${location.pathname.startsWith('/dashboard') ? 'dashboard-theme' : ''} ${location.pathname === '/ventas' ? 'sales-theme' : ''}`}>
    <header className="topbar">
      <button className="sidebar-toggle" type="button" onClick={toggleSidebar} aria-label="Mostrar u ocultar menú">☰</button>
      <NavLink className="topbar-brand" to={user ? '/dashboard' : '/'}><span className="brand-mark">S</span><span>SalesIA <b>Enterprise</b></span></NavLink>
      <div className="topbar-search"><span>⌕</span><input aria-label="Buscar" placeholder="Buscar en SalesIA..." /><kbd>⌘ K</kbd></div>
      
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {user ? <>
          <button className="topbar-icon" aria-label="Notificaciones">♢<i /></button>
          <button className="user-menu" aria-label="Abrir menú de usuario" type="button">
            <span className="avatar">{user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
            <span className="user-summary"><b>{user.name}</b><small>{user.email}</small></span>
            <span>⌄</span>
          </button>
          <button className="preview-signout" onClick={logout} type="button" title="Cerrar sesión">Cerrar sesión</button>
        </> : <NavLink to="/" className="preview-home-link">Volver a portada</NavLink>}
      </div>
    </header>

    <aside className="sidebar">
      <div className="sidebar-workspace"><span className="eyebrow">ESPACIO DE TRABAJO</span><strong>{companyName}</strong><span>⌄</span></div>
      <nav className="navigation" aria-label="Navegación principal">
        {user ? <>
          <span className="nav-label">PRINCIPAL</span>
          {visibleMainNavigation.map((item) => <NavigationLink key={item.path} item={item} />)}
          <span className="nav-label">EMPRESA</span>
          <NavigationGroup key={location.pathname} label="Empresa" icon="⌂" items={companyNavigation} initialOpen={companyActive} collapsed={!sidebarOpen} isAdmin={isAdmin} />
          <span className="nav-label">SISTEMA</span>
          {isAdmin && <NavigationLink item={{ label: 'Auditoría', path: '/historial', icon: '◷' }} />}
          <NavigationLink item={{ label: 'Reportes', path: '/reportes', icon: '▥' }} />
          {isAdmin && <><NavigationLink item={{ label: 'Usuarios', path: '/usuarios', icon: '♙' }} /><NavigationLink item={{ label: 'Configuración', path: '/configuracion', icon: '⚙' }} /></>}
        </> : <>
          <span className="nav-label">MÓDULOS DE DEMOSTRACIÓN</span>
          {dashboardModules.map((module) => <button
            key={module.id}
            type="button"
            className={`nav-item nav-module-trigger ${activeDashboardModule === module.id ? 'active' : ''}`}
            onClick={() => {
              setActiveDashboardModule(module.id)
              document.getElementById(`dashboard-section-${module.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          ><span className="nav-icon" aria-hidden="true">{module.icon}</span><span>{module.label}</span></button>)}
        </>}
      </nav>
      <div className="sidebar-footer"><div className={`sidebar-status ${apiStatus === 'API conectada' || apiStatus === 'Demo frontend' ? 'connected' : 'disconnected'}`}><i /> {apiStatus}</div><small>{user ? <>SalesIA Enterprise<br />PostgreSQL · Supabase</> : <>Datos ficticios<br />Modo frontend · sin API</>}</small></div>
    </aside>

    <main className="main-content"><div className="page-content"><Outlet /></div><footer className="app-footer"><span>© 2026 SalesIA Enterprise</span><span>{apiStatus}</span></footer></main>
  </div>
}
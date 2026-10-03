export type DashboardModuleId = 'resumen' | 'ventas' | 'productos' | 'clientes' | 'vendedores' | 'variables' | 'probabilidad' | 'insights'

export const dashboardModules: { id: DashboardModuleId; label: string; icon: string }[] = [
  { id: 'resumen', label: 'Resumen', icon: '▦' },
  { id: 'ventas', label: 'Ventas', icon: '↗' },
  { id: 'productos', label: 'Productos', icon: '□' },
  { id: 'clientes', label: 'Clientes', icon: '♙' },
  { id: 'vendedores', label: 'Vendedores', icon: '♧' },
  { id: 'variables', label: 'Variables estadísticas', icon: '⌁' },
  { id: 'probabilidad', label: 'Probabilidad y Bayes', icon: '%' },
  { id: 'insights', label: 'Insights', icon: '∿' },
]

export function DashboardModuleTabs({
  activeModule,
  onChange,
}: {
  activeModule: DashboardModuleId
  onChange: (module: DashboardModuleId) => void
}) {
  return <nav className="dashboard-module-tabs" aria-label="Módulos del dashboard">
    {dashboardModules.map((module) => <button
      key={module.id}
      type="button"
      aria-pressed={activeModule === module.id}
      className={activeModule === module.id ? 'active' : ''}
      onClick={() => onChange(module.id)}
    >{module.label}</button>)}
  </nav>
}
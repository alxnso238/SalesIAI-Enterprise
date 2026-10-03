import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { apiRequest, apiRoutes } from '../services/api'
import './dashboard.css'

type MonthlySale = { month: string; total: number }
type BranchSale = { branch: string; total: number; orders: number }
type ProductSale = { product: string; total: number; quantity: number }
type ProductRotation = { product: string; stock: number; sold_quantity: number; rotation: number }
type ActivityRecord = { id: number; resource: string; label: string; created_at: string }
type TargetProgress = { id: number; name: string; actual: number; goal: number; completion_percent: number; unit: string; period_active: boolean }
type DashboardReport = {
  sales: { current: number; records: number }
  inventory: { quantity: number; records: number }
  companies: number
  branches: number
  products: number
  targets: number
  active_targets: number
  inventory_rotation: ProductRotation[]
  recent_activity: ActivityRecord[]
  target_progress: TargetProgress[]
  sales_by_month: MonthlySale[]
  sales_by_branch: BranchSale[]
  sales_by_product: ProductSale[]
}

const initialReport: DashboardReport = {
  sales: { current: 0, records: 0 },
  inventory: { quantity: 0, records: 0 },
  companies: 0,
  branches: 0,
  products: 0,
  targets: 0,
  active_targets: 0,
  inventory_rotation: [],
  recent_activity: [],
  target_progress: [],
  sales_by_month: [],
  sales_by_branch: [],
  sales_by_product: [],
}

const currency = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  maximumFractionDigits: 0,
})

export function DashboardPage() {
  const { user } = useAuth()
  const role = user?.role ?? 'viewer'
  const isAdmin = role === 'admin'
  const isMember = role === 'member'
  const isAnalyst = role === 'analyst'
  const isViewer = role === 'viewer'
  const canOperateBusiness = isAdmin || isMember
  const canAnalyze = isAdmin || isMember || isAnalyst
  const [report, setReport] = useState(initialReport)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [chartRange, setChartRange] = useState<'month' | 'year'>('year')

  useEffect(() => {
    apiRequest<DashboardReport>(apiRoutes.reports)
      .then((data) => {
        setReport(data)
        setUpdatedAt(new Date())
      })
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : 'No se pudieron consultar los datos.')
      })
      .finally(() => setLoading(false))
  }, [])

  const chartMonths = chartRange === 'month' ? report.sales_by_month.slice(-1) : report.sales_by_month
  const maxMonthlyTotal = Math.max(...chartMonths.map((item) => item.total), 1)
  const chartTotal = chartMonths.reduce((total, item) => total + item.total, 0)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentMonthSales = report.sales_by_month.find((item) => item.month === currentMonth)?.total ?? 0
  const featuredTarget = report.target_progress.find((target) => target.period_active) ?? report.target_progress[0]
  const featuredTargetProgress = Math.min(100, Math.max(0, featuredTarget?.completion_percent ?? 0))
  const formatTargetValue = (value: number) => featuredTarget?.unit === 'importe'
    ? currency.format(value)
    : `${value.toLocaleString('es-PE')} unidades`
  const executiveKpis = [
    { label: 'Ventas del mes', value: currency.format(currentMonthSales), detail: 'Importe registrado', icon: '↗', tone: 'primary' },
    { label: 'Pedidos procesados', value: String(report.sales.records), detail: 'Transacciones persistidas', icon: '▤', tone: 'info' },
    { label: 'Unidades en inventario', value: report.inventory.quantity.toLocaleString('es-PE'), detail: `${report.inventory.records} movimientos`, icon: '◈', tone: 'warning' },
    { label: 'Ticket promedio', value: currency.format(report.sales.records ? report.sales.current / report.sales.records : 0), detail: 'Importe promedio por venta', icon: '∿', tone: 'success' },
  ]
  const kpis = isAdmin ? executiveKpis : isMember ? [
    executiveKpis[0], executiveKpis[2], executiveKpis[3],
  ] : [
    executiveKpis[0], executiveKpis[1], executiveKpis[3],
  ]
  const dashboardTitle = isAdmin ? 'Dashboard ejecutivo' : isMember ? 'Panel operativo' : isAnalyst ? 'Panel de análisis' : 'Panel de reportes'
  const dashboardDescription = isAdmin
    ? 'Resumen de ventas, inventario e indicadores empresariales.'
      : isMember
        ? 'Resumen de ventas, inventario y desempeño comercial.'
        : isAnalyst
          ? 'Indicadores estadísticos y evolución de las ventas.'
        : 'Indicadores disponibles en modo de solo lectura.'

  return <div className="dashboard-page">
    <section className="dashboard-brandbar" aria-label="Estado del espacio de trabajo">
      <div className="dashboard-brand-lockup"><span className="dashboard-brand-mark">S</span><span><strong>SALESIA</strong><small>ENTERPRISE</small></span></div>
      <div className={`dashboard-sync ${error ? 'offline' : ''}`}><i /> <span><small>ÚLTIMA ACTUALIZACIÓN</small><strong>{loading ? 'Sincronizando…' : error ? 'Sin conexión' : `Hoy, ${updatedAt?.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`}</strong></span><b>{error ? 'Sin conexión' : loading ? 'Actualizando' : 'En línea'}</b></div>
    </section>
    <div className="dashboard-heading">
      <div><div className="breadcrumb-line"><span>Inicio</span><span>/</span><b>Dashboard</b></div><h1>{dashboardTitle}</h1><p>{dashboardDescription}</p></div>
      <div className="heading-actions"><label className="dashboard-period"><span className="sr-only">Período del gráfico</span><select value={chartRange} onChange={(event) => setChartRange(event.target.value as 'month' | 'year')}><option value="month">Este mes</option><option value="year">Últimos 12 meses</option></select></label>{canOperateBusiness && <Link className="dashboard-action-button" to="/ventas">＋ Nueva venta</Link>}</div>
    </div>
    {error && <p className="dashboard-error" role="alert">{error}</p>}
    <section className={`kpi-grid ${kpis.length < 5 ? 'compact-kpis' : ''}`} aria-label="Indicadores del dashboard">
      {kpis.map((kpi) => <article className={`stat-card ${kpi.tone}`} key={kpi.label}>
        <div className="stat-card-body"><div><span className="stat-label">{kpi.label}</span><strong>{loading ? '...' : kpi.value}</strong></div><span className="stat-icon">{kpi.icon}</span></div>
        <div className="stat-card-footer"><b>{loading ? 'Consultando' : kpi.detail}</b><span>PostgreSQL</span></div>
      </article>)}
    </section>
    <section className="chart-grid">
      <article className="content-card chart-card">
        <div className="card-header"><div><h2>Ventas mensuales</h2><p>Importes agrupados por mes de creación</p></div></div>
        <div className="chart-total"><strong>{loading ? '...' : currency.format(chartTotal)}</strong><span>{chartRange === 'month' ? 'Mes actual' : 'Últimos 12 meses'}</span></div>
        <div className="sales-chart" role="img" aria-label="Ventas acumuladas por mes durante los últimos doce meses">
          <div className="chart-y-axis"><span>{currency.format(maxMonthlyTotal)}</span><span>{currency.format(maxMonthlyTotal / 2)}</span><span>{currency.format(0)}</span></div>
          <div className="chart-area"><div className="chart-grid-lines"><i /><i /><i /></div><div className="chart-bars">
            {chartMonths.map((item, index) => <div className="bar-column" key={item.month} title={`${item.month}: ${currency.format(item.total)}`}>
              <div className={`chart-bar ${index === chartMonths.length - 1 ? 'current' : ''}`} style={{ height: `${Math.max((item.total / maxMonthlyTotal) * 90, item.total > 0 ? 10 : 0)}%` }} />
              <span>{new Intl.DateTimeFormat('es', { month: 'short' }).format(new Date(`${item.month}-01T00:00:00`))}</span>
            </div>)}
          </div></div>
        </div>
        {!loading && chartMonths.every((item) => item.total === 0) && <p className="dashboard-empty">Aún no hay ventas para graficar en este período.</p>}
      </article>
      <article className="content-card dashboard-target-card">
        <div className="card-header"><div><h2>Cumplimiento de meta</h2><p>{featuredTarget?.name ?? 'Ventas del período actual'}</p></div></div>
        {featuredTarget ? <>
          <div className="dashboard-target-ring-wrap"><div className="dashboard-target-ring" role="img" aria-label={`Cumplimiento de ${featuredTarget.name}: ${featuredTarget.completion_percent}%`} style={{ background: `conic-gradient(var(--blue) ${featuredTargetProgress}%, #303944 ${featuredTargetProgress}% 100%)` }}><div><strong>{featuredTarget.completion_percent.toLocaleString('es-PE')}<small>%</small></strong><span>{featuredTarget.period_active ? 'cumplido' : 'fuera de período'}</span></div></div></div>
          <div className="dashboard-target-values"><div><span>Actual</span><strong>{formatTargetValue(featuredTarget.actual)}</strong></div><div><span>Objetivo</span><strong>{formatTargetValue(featuredTarget.goal)}</strong></div></div>
          <div className="dashboard-target-progress"><i><em style={{ width: `${featuredTargetProgress}%` }} /></i><span>Faltan {formatTargetValue(Math.max(0, featuredTarget.goal - featuredTarget.actual))} para alcanzar la meta.</span></div>
        </> : <div className="dashboard-target-empty"><p>Todavía no hay metas activas para mostrar.</p>{isAdmin && <Link to="/metas">Crear una meta</Link>}</div>}
      </article>
    </section>
    {isAdmin && <section className="data-grid">
      <article className="content-card table-card">
        <div className="card-header"><div><h2>Ventas por sucursal</h2><p>Distribución de ingresos registrados</p></div><Link className="dashboard-card-link" to="/reportes">Ver reporte →</Link></div>
        <div className="table-wrap dashboard-branch-table"><table><thead><tr><th>Sucursal</th><th>Ventas netas</th><th>Participación</th><th>Pedidos</th></tr></thead><tbody>{report.sales_by_branch.slice(0, 5).map((branch) => {
          const share = report.sales.current ? branch.total / report.sales.current * 100 : 0
          return <tr key={branch.branch}><td><span className="dashboard-branch-mark">{branch.branch.slice(0, 1).toUpperCase()}</span>{branch.branch}</td><td>{currency.format(branch.total)}</td><td><div className="dashboard-share"><span>{share.toFixed(1)}%</span><i><em style={{ width: `${Math.min(100, share)}%` }} /></i></div></td><td>{branch.orders}</td></tr>
        })}</tbody></table>{!loading && report.sales_by_branch.length === 0 && <p className="dashboard-empty">Las ventas aparecerán al registrar pedidos por sucursal.</p>}</div>
      </article>
      <article className="content-card table-card">
        <div className="card-header"><div><h2>Actividad reciente</h2><p>Últimos cambios en el espacio de trabajo</p></div></div>
        <div className="dashboard-activity-list">{report.recent_activity.slice(0, 6).map((activity) => <div key={`${activity.resource}-${activity.id}`}><span>{activity.resource}</span><b>{activity.label}</b><time>{new Date(activity.created_at).toLocaleString()}</time></div>)}{!loading && report.recent_activity.length === 0 && <p className="dashboard-empty">La actividad aparecerá cuando se registren datos.</p>}</div>
      </article>
    </section>}
    {isAdmin && <section className="data-grid dashboard-summary-grid">
      <article className="content-card table-card">
        <div className="card-header"><div><h2>Resumen operativo</h2><p>Indicadores clave del espacio</p></div></div>
        <div className="dashboard-operational-metrics"><div><span>Ticket promedio</span><strong>{currency.format(report.sales.records ? report.sales.current / report.sales.records : 0)}</strong></div><div><span>Metas activas</span><strong>{report.active_targets}</strong></div><div><span>Movimientos de inventario</span><strong>{report.inventory.records}</strong></div><div><span>Ventas registradas</span><strong>{report.sales.records}</strong></div></div>
      </article>
      <article className="content-card table-card">
        <div className="card-header"><div><h2>Productos más vendidos</h2><p>Ingresos por producto</p></div></div>
        <div className="dashboard-top-products">{[...report.sales_by_product].sort((left, right) => right.total - left.total).slice(0, 4).map((product) => {
          const maxTotal = Math.max(...report.sales_by_product.map((item) => item.total), 1)
          return <div key={product.product}><div><span>{product.product}</span><b>{currency.format(product.total)}</b></div><small>{product.quantity.toLocaleString('es-PE')} unidades</small><i><em style={{ width: `${Math.max(4, product.total / maxTotal * 100)}%` }} /></i></div>
        })}{!loading && report.sales_by_product.length === 0 && <p className="dashboard-empty">Las ventas con producto asociado aparecerán aquí.</p>}</div>
      </article>
    </section>}
    {isMember && <section className="data-grid">
      <article className="content-card table-card">
        <div className="card-header"><div><h2>Recursos del espacio</h2><p>Datos base disponibles para consulta</p></div></div>
        <div className="table-wrap"><table><thead><tr><th>Recurso</th><th>Total</th></tr></thead><tbody>
          <tr><td>Empresas</td><td>{loading ? '...' : report.companies}</td></tr>
          <tr><td>Sucursales</td><td>{loading ? '...' : report.branches}</td></tr>
          <tr><td>Productos</td><td>{loading ? '...' : report.products}</td></tr>
        </tbody></table></div>
      </article>
    </section>}
    {isViewer && <section className="data-grid">
      <article className="content-card table-card">
        <div className="card-header"><div><h2>Resumen de consulta</h2><p>Totales reportados en el espacio</p></div></div>
        <div className="table-wrap"><table><thead><tr><th>Indicador</th><th>Total</th></tr></thead><tbody>
          <tr><td>Empresas</td><td>{loading ? '...' : report.companies}</td></tr>
          <tr><td>Sucursales</td><td>{loading ? '...' : report.branches}</td></tr>
          <tr><td>Productos</td><td>{loading ? '...' : report.products}</td></tr>
        </tbody></table></div>
      </article>
    </section>}
  </div>
}

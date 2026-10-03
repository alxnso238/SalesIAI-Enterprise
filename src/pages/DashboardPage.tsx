import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { apiRequest, apiRoutes } from '../services/api'
import { DashboardFilterBar, type DashboardFilters } from '../modules/dashboard/components/DashboardFilterBar'
import { DashboardModuleTabs, dashboardModules, type DashboardModuleId } from '../modules/dashboard/components/DashboardModuleTabs'
import './dashboard.css'

type MonthlySale = { month: string; total: number }
type BranchSale = { branch: string; total: number; orders: number }
type ProductSale = { product: string; total: number; quantity: number }
type ProductRotation = { product: string; stock: number; sold_quantity: number; rotation: number }
type ActivityRecord = { id: number; resource: string; label: string; created_at: string }
type TargetProgress = { id: number; name: string; actual: number; goal: number; completion_percent: number; unit: string; period_active: boolean }
type SellerSale = { seller: string; revenue: number; sales_count: number }
type CustomerSale = { customer: string; revenue: number; sales_count: number }
type CustomerRecord = { id: number; full_name: string; email?: string; phone?: string }
type ProductRecord = { id: number; name: string; category: string; price: number; stock: number }
type AnalysisRecord = { operation: string; result: Record<string, number | string> }
type DashboardAnalytics = {
  sales_count: number
  total_revenue: number
  average_sale: number
  median_sale: number
  average_quantity: number
  sales_by_month: MonthlySale[]
  sales_by_product: { product: string; revenue: number; quantity: number }[]
  sales_by_seller: SellerSale[]
  sales_by_customer: CustomerSale[]
  insights: { rule_code: string; title: string; description: string; severity: string; evidence: { sales_count: number; mean: number; median: number } }[]
  filter_options: { branches: string[]; sellers: string[]; categories: string[] }
}
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

const emptyAnalytics: DashboardAnalytics = {
  sales_count: 0,
  total_revenue: 0,
  average_sale: 0,
  median_sale: 0,
  average_quantity: 0,
  sales_by_month: [],
  sales_by_product: [],
  sales_by_seller: [],
  sales_by_customer: [],
  insights: [],
  filter_options: { branches: [], sellers: [], categories: [] },
}

const emptyFilters: DashboardFilters = { date_from: '', date_to: '', branch: '', seller: '', category: '' }

const demoReport: DashboardReport = {
  sales: { current: 121200, records: 46 },
  inventory: { quantity: 834, records: 38 },
  companies: 1,
  branches: 3,
  products: 5,
  targets: 3,
  active_targets: 2,
  inventory_rotation: [
    { product: 'Café de origen 500 g', stock: 45, sold_quantity: 128, rotation: 2.84 },
    { product: 'Taza térmica', stock: 25, sold_quantity: 54, rotation: 2.16 },
    { product: 'Kit de degustación', stock: 70, sold_quantity: 102, rotation: 1.46 },
    { product: 'Molino manual', stock: 32, sold_quantity: 38, rotation: 1.19 },
  ],
  recent_activity: [
    { id: 1, resource: 'Ventas', label: 'Pedido SA-1046 completado', created_at: '2026-10-03T14:30:00Z' },
    { id: 2, resource: 'Clientes', label: 'Nuevo cliente: Lucía Herrera', created_at: '2026-10-03T12:10:00Z' },
    { id: 3, resource: 'Inventario', label: 'Reposición de café de origen', created_at: '2026-10-02T16:45:00Z' },
    { id: 4, resource: 'Productos', label: 'Precio actualizado: Taza térmica', created_at: '2026-10-02T10:20:00Z' },
  ],
  target_progress: [
    { id: 1, name: 'Ingresos de octubre', actual: 18400, goal: 25000, completion_percent: 73.6, unit: 'importe', period_active: true },
    { id: 2, name: 'Unidades del trimestre', actual: 684, goal: 900, completion_percent: 76, unit: 'unidades', period_active: true },
    { id: 3, name: 'Ventas de septiembre', actual: 14800, goal: 15000, completion_percent: 98.7, unit: 'importe', period_active: false },
  ],
  sales_by_month: [
    { month: '2025-11', total: 8300 }, { month: '2025-12', total: 8700 },
    { month: '2026-01', total: 9100 }, { month: '2026-02', total: 9400 },
    { month: '2026-03', total: 9800 }, { month: '2026-04', total: 10200 },
    { month: '2026-05', total: 9800 }, { month: '2026-06', total: 10500 },
    { month: '2026-07', total: 10800 }, { month: '2026-08', total: 11100 },
    { month: '2026-09', total: 11500 }, { month: '2026-10', total: 12000 },
  ],
  sales_by_branch: [
    { branch: 'Lima Centro', total: 52300, orders: 18 },
    { branch: 'Arequipa', total: 41200, orders: 15 },
    { branch: 'Cusco', total: 27700, orders: 13 },
  ],
  sales_by_product: [
    { product: 'Café de origen 500 g', total: 43800, quantity: 128 },
    { product: 'Kit de degustación', total: 31900, quantity: 102 },
    { product: 'Taza térmica', total: 26800, quantity: 54 },
    { product: 'Molino manual', total: 13700, quantity: 38 },
    { product: 'Filtro reutilizable', total: 5000, quantity: 72 },
  ],
}

const demoAnalytics: DashboardAnalytics = {
  sales_count: 46,
  total_revenue: 121200,
  average_sale: 2634.78,
  median_sale: 2180,
  average_quantity: 2.4,
  sales_by_month: demoReport.sales_by_month,
  sales_by_product: demoReport.sales_by_product.map((product) => ({ product: product.product, revenue: product.total, quantity: product.quantity })),
  sales_by_seller: [
    { seller: 'sofia.mendez@demo.salesia', revenue: 39200, sales_count: 15 },
    { seller: 'marco.salas@demo.salesia', revenue: 32800, sales_count: 12 },
    { seller: 'ines.rojas@demo.salesia', revenue: 28600, sales_count: 11 },
    { seller: 'diego.leon@demo.salesia', revenue: 20600, sales_count: 8 },
  ],
  sales_by_customer: [
    { customer: 'Lucía Herrera', revenue: 12400, sales_count: 5 },
    { customer: 'Mateo Salazar', revenue: 9800, sales_count: 4 },
    { customer: 'Valentina Cruz', revenue: 8700, sales_count: 3 },
    { customer: 'Andrés Paredes', revenue: 6900, sales_count: 3 },
  ],
  insights: [{
    rule_code: 'sales.mean_above_median',
    title: 'Algunas ventas elevan el promedio',
    description: 'La media supera la mediana: unas pocas ventas de mayor importe están elevando el ticket promedio.',
    severity: 'info',
    evidence: { sales_count: 46, mean: 2634.78, median: 2180 },
  }],
  filter_options: {
    branches: ['Lima Centro', 'Arequipa', 'Cusco'],
    sellers: ['sofia.mendez@demo.salesia', 'marco.salas@demo.salesia', 'ines.rojas@demo.salesia', 'diego.leon@demo.salesia'],
    categories: ['Café', 'Accesorios', 'Equipamiento'],
  },
}

const demoCustomers: CustomerRecord[] = [
  { id: 1, full_name: 'Lucía Herrera', email: 'lucia.herrera@demo.salesia', phone: '+51 900 120 001' },
  { id: 2, full_name: 'Mateo Salazar', email: 'mateo.salazar@demo.salesia', phone: '+51 900 120 002' },
  { id: 3, full_name: 'Valentina Cruz', email: 'valentina.cruz@demo.salesia', phone: '+51 900 120 003' },
  { id: 4, full_name: 'Andrés Paredes', email: 'andres.paredes@demo.salesia', phone: '+51 900 120 004' },
]

const demoProducts: ProductRecord[] = [
  { id: 1, name: 'Café de origen 500 g', category: 'Café', price: 84, stock: 45 },
  { id: 2, name: 'Kit de degustación', category: 'Café', price: 129, stock: 70 },
  { id: 3, name: 'Taza térmica', category: 'Accesorios', price: 96, stock: 25 },
  { id: 4, name: 'Molino manual', category: 'Equipamiento', price: 248, stock: 32 },
  { id: 5, name: 'Filtro reutilizable', category: 'Accesorios', price: 34, stock: 162 },
]

const currency = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  maximumFractionDigits: 0,
})

function isDashboardModuleId(value: string | null): value is DashboardModuleId {
  return dashboardModules.some((module) => module.id === value)
}

const dashboardModuleTitles: Record<DashboardModuleId, string> = {
  resumen: 'Resumen ejecutivo',
  ventas: 'Ventas',
  productos: 'Productos e inventario',
  clientes: 'Clientes',
  vendedores: 'Vendedores',
  variables: 'Variables estadísticas',
  probabilidad: 'Probabilidad y Bayes',
  insights: 'Insights comerciales',
}

const dashboardModuleDescriptions: Record<DashboardModuleId, string> = {
  resumen: 'KPIs generales, metas y actividad reciente del negocio.',
  ventas: 'Evolución temporal y distribución comercial de los ingresos.',
  productos: 'Catálogo, disponibilidad y rendimiento por producto.',
  clientes: 'Comportamiento de compra e historial comercial de clientes.',
  vendedores: 'Ingresos y transacciones agrupados por vendedor.',
  variables: 'Media, mediana y comparación de observaciones.',
  probabilidad: 'Calculadora del Teorema de Bayes para eventos comerciales.',
  insights: 'Observaciones estadísticas con evidencia numérica.',
}

export function DashboardPage() {
  const { user } = useAuth()
  const previewMode = !user
  const role = user?.role ?? 'viewer'
  const isAdmin = role === 'admin'
  const isMember = role === 'member'
  const isAnalyst = role === 'analyst'
  const isViewer = role === 'viewer'
  const canOperateBusiness = isAdmin || isMember
  const canAnalyze = previewMode || isAdmin || isMember || isAnalyst
  const [report, setReport] = useState(initialReport)
  const [analytics, setAnalytics] = useState(emptyAnalytics)
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [chartRange, setChartRange] = useState<'month' | 'year'>('year')
  const [activeModule, setActiveModule] = useState<DashboardModuleId>('resumen')
  const [filters, setFilters] = useState<DashboardFilters>(emptyFilters)
  const [observationValues, setObservationValues] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisRecord | null>(null)
  const [bayesValues, setBayesValues] = useState({ prior: '0.5', likelihood: '0.8', falsePositive: '0.2' })
  const [bayesResult, setBayesResult] = useState<AnalysisRecord | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const analyticsParams = new URLSearchParams(Object.entries(filters).filter(([, value]) => value))
  const analyticsUrl = `${apiRoutes.statistics.analytics}${analyticsParams.size ? `?${analyticsParams}` : ''}`

  useEffect(() => {
    if (!user?.token) {
      setLoading(false)
      setUpdatedAt(new Date())
      setError('')
      setReport(demoReport)
      setAnalytics(demoAnalytics)
      setCustomers(demoCustomers)
      setProducts(demoProducts)
      return
    }
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      apiRequest<DashboardReport>(apiRoutes.reports),
      apiRequest<DashboardAnalytics>(analyticsUrl),
      apiRequest<CustomerRecord[]>(`${apiRoutes.resources}/customers`),
      apiRequest<ProductRecord[]>(`${apiRoutes.resources}/products`),
    ])
      .then(([data, summary, customerRecords, productRecords]) => {
        if (!active) return
        setReport(data)
        setAnalytics(summary)
        setCustomers(customerRecords)
        setProducts(productRecords)
        setUpdatedAt(new Date())
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'No se pudieron consultar los datos.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.token, analyticsUrl])

  useEffect(() => {
    const sections = dashboardModules.flatMap((module) => {
      const section = document.getElementById(`dashboard-section-${module.id}`)
      return section ? [{ module, section }] : []
    })
    const observer = new IntersectionObserver((entries) => {
      const visibleSection = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]
      const moduleId = visibleSection?.target.id.replace('dashboard-section-', '')
      if (moduleId && isDashboardModuleId(moduleId)) {
        setActiveModule(moduleId)
        window.dispatchEvent(new CustomEvent('salesia-dashboard-module', { detail: moduleId }))
      }
    }, { rootMargin: '-90px 0px -62% 0px', threshold: [0, 0.15, 0.35] })
    sections.forEach(({ section }) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  const chartMonths = chartRange === 'month' ? analytics.sales_by_month.slice(-1) : analytics.sales_by_month
  const maxMonthlyTotal = Math.max(...chartMonths.map((item) => item.total), 1)
  const maxSellerRevenue = Math.max(...analytics.sales_by_seller.map((seller) => seller.revenue), 1)
  const maxProductRevenue = Math.max(...analytics.sales_by_product.map((product) => product.revenue), 1)
  const maxInventoryRotation = Math.max(...report.inventory_rotation.map((item) => item.rotation), 1)
  const chartTotal = chartMonths.reduce((total, item) => total + item.total, 0)
  const featuredTarget = report.target_progress.find((target) => target.period_active) ?? report.target_progress[0]
  const featuredTargetProgress = Math.min(100, Math.max(0, featuredTarget?.completion_percent ?? 0))
  const formatTargetValue = (value: number) => featuredTarget?.unit === 'importe'
    ? currency.format(value)
    : `${value.toLocaleString('es-PE')} unidades`
  const executiveKpis = [
    { label: 'Ingresos completados', value: currency.format(analytics.total_revenue), detail: 'Ventas no canceladas', icon: '↗', tone: 'primary' },
    { label: 'Ventas procesadas', value: String(analytics.sales_count), detail: 'Transacciones completadas', icon: '▤', tone: 'info' },
    { label: 'Ticket promedio', value: currency.format(analytics.average_sale), detail: 'Media aritmética', icon: '∿', tone: 'success' },
    { label: 'Mediana de venta', value: currency.format(analytics.median_sale), detail: 'Valor central', icon: '≈', tone: 'warning' },
    { label: 'Unidades en inventario', value: report.inventory.quantity.toLocaleString('es-PE'), detail: `${report.inventory.records} movimientos`, icon: '◈', tone: 'info' },
  ]
  const kpis = isAdmin ? executiveKpis : isMember ? [
    executiveKpis[0], executiveKpis[2], executiveKpis[4],
  ] : [
    executiveKpis[0], executiveKpis[1], executiveKpis[3],
  ]
  const dashboardTitle = previewMode ? 'Dashboard de demostración' : isAdmin ? 'Dashboard ejecutivo' : isMember ? 'Panel operativo' : isAnalyst ? 'Panel de análisis' : 'Panel de reportes'
  const dashboardDescription = previewMode
    ? 'Datos ficticios locales · sin cuenta ni conexión a APIs.'
    : 'Resumen conectado de ventas, clientes, productos, inventario y analítica.'

  const updateFilter = (key: keyof DashboardFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const calculateVariableStats = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = observationValues.split(/[\s,;]+/).filter(Boolean).map(Number)
    if (!values.length || values.some((value) => !Number.isFinite(value))) {
      setActionError('Ingresa valores numéricos separados por coma o espacio.')
      return
    }
    setActionLoading(true)
    setActionError('')
    try {
      if (previewMode) {
        const sortedValues = [...values].sort((left, right) => left - right)
        const middle = Math.floor(sortedValues.length / 2)
        const median = sortedValues.length % 2
          ? sortedValues[middle]
          : (sortedValues[middle - 1] + sortedValues[middle]) / 2
        const mean = values.reduce((total, value) => total + value, 0) / values.length
        setAnalysisResult({ operation: 'compare', result: { mean, median, difference: mean - median, sample_size: values.length } })
        return
      }
      const result = await apiRequest<AnalysisRecord>(apiRoutes.statistics.compare, {
        method: 'POST',
        body: JSON.stringify({ values }),
      })
      setAnalysisResult(result)
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'No se pudo calcular el análisis.')
    } finally {
      setActionLoading(false)
    }
  }

  const calculateBayes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setActionLoading(true)
    setActionError('')
    try {
      if (previewMode) {
        const prior = Number(bayesValues.prior)
        const likelihood = Number(bayesValues.likelihood)
        const falsePositive = Number(bayesValues.falsePositive)
        const evidence = likelihood * prior + falsePositive * (1 - prior)
        if (evidence === 0) throw new Error('La probabilidad de evidencia no puede ser cero.')
        setBayesResult({ operation: 'bayes', result: { probability_a_given_b: likelihood * prior / evidence, probability_b: evidence } })
        return
      }
      const result = await apiRequest<AnalysisRecord>(apiRoutes.statistics.bayes, {
        method: 'POST',
        body: JSON.stringify({
          probability_a: Number(bayesValues.prior),
          probability_b_given_a: Number(bayesValues.likelihood),
          probability_b_given_not_a: Number(bayesValues.falsePositive),
        }),
      })
      setBayesResult(result)
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'No se pudo calcular Bayes.')
    } finally {
      setActionLoading(false)
    }
  }

  const customerSales = new Map(analytics.sales_by_customer.map((item) => [item.customer.trim().toLocaleLowerCase(), item]))

  return <div className="dashboard-page">
    <section className="dashboard-brandbar" aria-label="Estado del espacio de trabajo">
      <div className="dashboard-brand-lockup"><span className="dashboard-brand-mark">S</span><span><strong>SALESIA</strong><small>ENTERPRISE</small></span></div>
      <div className={`dashboard-sync ${error ? 'offline' : ''}`}><i /> <span><small>ESTADO DEL PANEL</small><strong>{loading ? 'Sincronizando…' : error ? 'Sin conexión' : previewMode ? 'Datos ficticios locales' : `Hoy, ${updatedAt?.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`}</strong></span><b>{error ? 'Sin conexión' : loading ? 'Actualizando' : previewMode ? 'Demo frontend' : 'En línea'}</b></div>
    </section>
    <div className="dashboard-heading">
      <div><div className="breadcrumb-line"><span>Inicio</span><span>/</span><b>Dashboard</b></div><h1>{dashboardTitle}</h1><p>{dashboardDescription}</p></div>
      <div className="heading-actions"><label className="dashboard-period"><span className="sr-only">Período del gráfico</span><select value={chartRange} onChange={(event) => setChartRange(event.target.value as 'month' | 'year')}><option value="month">Este mes</option><option value="year">Últimos 12 meses</option></select></label>{canOperateBusiness && <Link className="dashboard-action-button" to="/ventas">＋ Nueva venta</Link>}</div>
    </div>
    {error && <p className="dashboard-error" role="alert">{error}</p>}
    {previewMode && <p className="dashboard-preview-notice">Demostración frontend · cifras de muestra · sin llamadas a APIs</p>}
    <section className={`kpi-grid ${kpis.length < 5 ? 'compact-kpis' : ''}`} aria-label="Indicadores del dashboard">
      {kpis.map((kpi) => <article className={`stat-card ${kpi.tone}`} key={kpi.label}>
        <div className="stat-card-body"><div><span className="stat-label">{kpi.label}</span><strong>{loading ? '...' : kpi.value}</strong></div><span className="stat-icon">{kpi.icon}</span></div>
        <div className="stat-card-footer"><b>{loading ? 'Consultando' : previewMode ? 'Dato de muestra' : kpi.detail}</b><span>{previewMode ? 'Demo' : 'PostgreSQL'}</span></div>
      </article>)}
    </section>
    <DashboardModuleTabs activeModule={activeModule} onChange={(module) => {
      setActiveModule(module)
      document.getElementById(`dashboard-section-${module}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.dispatchEvent(new CustomEvent('salesia-dashboard-module', { detail: module }))
    }} />
    <DashboardFilterBar disabled={previewMode}
      filters={filters}
      options={analytics.filter_options}
      onChange={updateFilter}
      onReset={() => setFilters(emptyFilters)}
    />
    <section className="chart-grid dashboard-module-section" id="dashboard-section-resumen">
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
    {(isAdmin || previewMode) && <section className="data-grid dashboard-module-section">
      <article className="content-card table-card">
        <div className="card-header"><div><h2>Ventas por sucursal</h2><p>Distribución de ingresos registrados</p></div>{!previewMode && <Link className="dashboard-card-link" to="/reportes">Ver reporte →</Link>}</div>
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
    {(isAdmin || previewMode) && <section className="data-grid dashboard-summary-grid dashboard-module-section">
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
    <section className="dashboard-module-grid dashboard-module-section" id="dashboard-section-ventas" aria-label="Módulo de ventas">
      <article className="content-card chart-card">
        <div className="card-header"><div><h2>Ventas por período</h2><p>Ingresos mensuales según los filtros activos</p></div></div>
        <div className="chart-total"><strong>{loading ? '...' : currency.format(chartTotal)}</strong><span>{chartRange === 'month' ? 'Mes actual' : 'Últimos 12 meses'}</span></div>
        <div className="sales-chart" role="img" aria-label="Tendencia de ventas por mes">
          <div className="chart-y-axis"><span>{currency.format(maxMonthlyTotal)}</span><span>{currency.format(maxMonthlyTotal / 2)}</span><span>{currency.format(0)}</span></div>
          <div className="chart-area"><div className="chart-grid-lines"><i /><i /><i /></div><div className="chart-bars">
            {chartMonths.map((item, index) => <div className="bar-column" key={item.month} title={`${item.month}: ${currency.format(item.total)}`}>
              <div className={`chart-bar ${index === chartMonths.length - 1 ? 'current' : ''}`} style={{ height: `${Math.max((item.total / maxMonthlyTotal) * 90, item.total > 0 ? 10 : 0)}%` }} />
              <span>{new Intl.DateTimeFormat('es', { month: 'short' }).format(new Date(`${item.month}-01T00:00:00`))}</span>
            </div>)}
          </div></div>
        </div>
        {!previewMode && !loading && chartMonths.every((item) => item.total === 0) && <p className="dashboard-empty">No hay ventas para los filtros seleccionados.</p>}
      </article>
      <article className="content-card dashboard-module-panel">
        <div className="card-header"><div><h2>Ventas por sucursal</h2><p>Comparación global de ingresos</p></div></div>
        <div className="dashboard-branch-list">{report.sales_by_branch.map((branch) => <div key={branch.branch}>
          <div><strong>{branch.branch}</strong><span>{branch.orders} ventas · {currency.format(branch.total)}</span></div>
          <i><em style={{ width: `${Math.max(3, branch.total / Math.max(report.sales.current, 1) * 100)}%` }} /></i>
        </div>)}{!previewMode && !loading && report.sales_by_branch.length === 0 && <p className="dashboard-empty">No hay ventas registradas por sucursal.</p>}</div>
      </article>
    </section>
    <section className="dashboard-module-grid dashboard-module-section" id="dashboard-section-productos" aria-label="Módulo de productos">
      <article className="content-card dashboard-module-panel">
        <div className="card-header"><div><h2>Estado del inventario</h2><p>Existencias y movimientos registrados</p></div></div>
        <div className="dashboard-inventory-metrics"><div><span>Unidades disponibles</span><strong>{loading ? '...' : report.inventory.quantity.toLocaleString('es-PE')}</strong></div><div><span>Movimientos</span><strong>{loading ? '...' : report.inventory.records.toLocaleString('es-PE')}</strong></div><div><span>Productos</span><strong>{loading ? '...' : report.products.toLocaleString('es-PE')}</strong></div></div>
      </article>
      <article className="content-card dashboard-module-panel">
        <div className="card-header"><div><h2>Rotación por producto</h2><p>Unidades vendidas en relación con stock disponible</p></div></div>
        <div className="dashboard-rotation-list">{report.inventory_rotation.slice().sort((left, right) => right.rotation - left.rotation).slice(0, 6).map((item) => <div key={item.product}>
          <div><strong>{item.product}</strong><span>{item.rotation.toLocaleString('es-PE', { maximumFractionDigits: 2 })}×</span></div><small>{item.sold_quantity} vendidas · {item.stock} en stock</small><i><em style={{ width: `${Math.max(3, item.rotation / maxInventoryRotation * 100)}%` }} /></i>
        </div>)}{!loading && report.inventory_rotation.length === 0 && <p className="dashboard-empty">No hay existencias para analizar todavía.</p>}</div>
      </article>
      <article className="content-card dashboard-module-panel">
        <div className="card-header"><div><h2>Catálogo de productos</h2><p>Precio, categoría y stock actual</p></div></div>
        <div className="dashboard-product-catalog">{products.slice(0, 8).map((product) => <div key={product.id}>
          <span><strong>{product.name}</strong><small>{product.category}</small></span><b>{currency.format(product.price)}</b><em>{product.stock} uds.</em>
        </div>)}{!previewMode && !loading && products.length === 0 && <p className="dashboard-empty">El catálogo aparecerá al registrar productos.</p>}</div>
      </article>
      <article className="content-card dashboard-module-panel">
        <div className="card-header"><div><h2>Productos más vendidos</h2><p>Rendimiento del período filtrado</p></div></div>
        <div className="dashboard-top-products">{analytics.sales_by_product.slice(0, 6).map((product) => <div key={product.product}>
          <div><span>{product.product}</span><b>{currency.format(product.revenue)}</b></div><small>{product.quantity.toLocaleString('es-PE')} unidades</small><i><em style={{ width: `${Math.max(3, product.revenue / maxProductRevenue * 100)}%` }} /></i>
        </div>)}{!previewMode && !loading && analytics.sales_by_product.length === 0 && <p className="dashboard-empty">No hay ventas de productos en el período filtrado.</p>}</div>
      </article>
    </section>
    <section className="dashboard-module-grid dashboard-module-section" id="dashboard-section-clientes" aria-label="Módulo de clientes">
      <article className="content-card dashboard-module-panel">
        <div className="card-header"><div><h2>Comportamiento de compra</h2><p>Ventas completadas por cliente en el período filtrado</p></div></div>
        <div className="dashboard-customer-list">{analytics.sales_by_customer.slice(0, 8).map((customer) => <div key={customer.customer}>
          <span className="dashboard-customer-avatar">{customer.customer.slice(0, 1).toUpperCase()}</span><strong>{customer.customer}</strong><span>{customer.sales_count} compras</span><b>{currency.format(customer.revenue)}</b>
        </div>)}{!previewMode && !loading && analytics.sales_by_customer.length === 0 && <p className="dashboard-empty">No hay compras de clientes para los filtros seleccionados.</p>}</div>
      </article>
      <article className="content-card dashboard-module-panel">
        <div className="card-header"><div><h2>Directorio de clientes</h2><p>{previewMode ? `${customers.length} clientes de demostración` : `${customers.length} clientes registrados`}</p></div></div>
        <div className="dashboard-customer-directory">{customers.slice(0, 8).map((customer) => <div key={customer.id}>
          <span><strong>{customer.full_name}</strong><small>{customer.email || customer.phone || 'Sin datos de contacto'}</small></span>
          <span>{customerSales.get(customer.full_name.trim().toLocaleLowerCase()) ? `${customerSales.get(customer.full_name.trim().toLocaleLowerCase())?.sales_count} compras` : 'Sin ventas'}</span>
        </div>)}{!previewMode && !loading && customers.length === 0 && <p className="dashboard-empty">No hay clientes registrados.</p>}</div>
      </article>
    </section>
    <section className="dashboard-module-grid dashboard-module-section" id="dashboard-section-vendedores" aria-label="Módulo de vendedores">
      <article className="content-card dashboard-module-panel">
        <div className="card-header"><div><h2>Métricas por vendedor</h2><p>Ingresos y ventas en el período filtrado</p></div></div>
        <div className="dashboard-seller-list">{analytics.sales_by_seller.map((seller) => <div className="dashboard-seller-row" key={seller.seller}>
          <div><strong>{seller.seller}</strong><span>{seller.sales_count} ventas · {currency.format(seller.revenue)}</span></div>
          <i><em style={{ width: `${Math.max(3, seller.revenue / maxSellerRevenue * 100)}%` }} /></i>
        </div>)}{!previewMode && !loading && analytics.sales_by_seller.length === 0 && <p className="dashboard-empty">No hay ventas por vendedor para los filtros seleccionados.</p>}</div>
      </article>
    </section>
    <section className="dashboard-module-grid dashboard-analytics-grid dashboard-module-section" id="dashboard-section-variables" aria-label="Módulo de variables estadísticas">
      <article className="content-card dashboard-module-panel">
        <div className="card-header"><div><h2>Estadística descriptiva</h2><p>Medidas calculadas sobre ventas completadas y filtros activos</p></div></div>
        <div className="dashboard-stat-comparison"><div><span>Media de venta</span><strong>{loading ? '...' : currency.format(analytics.average_sale)}</strong></div><div><span>Mediana de venta</span><strong>{loading ? '...' : currency.format(analytics.median_sale)}</strong></div><div><span>Media de unidades por venta</span><strong>{loading ? '...' : analytics.average_quantity.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</strong></div></div>
      </article>
      <article className="content-card dashboard-module-panel">
        <div className="card-header"><div><h2>Comparar observaciones</h2><p>Calcula media, mediana y diferencia</p></div></div>
        <form className="dashboard-calculator" onSubmit={(event) => void calculateVariableStats(event)}>
          <label>Valores numéricos<textarea value={observationValues} onChange={(event) => setObservationValues(event.target.value)} placeholder="120, 180, 240, 390" rows={3} required /></label>
          <button type="submit" disabled={!canAnalyze || actionLoading}>{actionLoading ? 'Calculando…' : 'Calcular comparación'}</button>
          {previewMode && <small>Cálculo local de demostración; no se guarda en servidor.</small>}
          {!canAnalyze && <small>Se requiere rol de analista para guardar el cálculo.</small>}
          {actionError && <p role="alert">{actionError}</p>}
          {analysisResult && <div className="dashboard-calculation-result"><span>Media <b>{Number(analysisResult.result.mean).toLocaleString('es-PE', { maximumFractionDigits: 2 })}</b></span><span>Mediana <b>{Number(analysisResult.result.median).toLocaleString('es-PE', { maximumFractionDigits: 2 })}</b></span><span>Diferencia <b>{Number(analysisResult.result.difference).toLocaleString('es-PE', { maximumFractionDigits: 2 })}</b></span></div>}
        </form>
      </article>
    </section>
    <section className="dashboard-module-grid dashboard-module-section" id="dashboard-section-probabilidad" aria-label="Módulo de probabilidad y Bayes">
      <article className="content-card dashboard-module-panel">
        <div className="card-header"><div><h2>Teorema de Bayes</h2><p>Calcula la probabilidad posterior a partir de tres valores entre 0 y 1</p></div></div>
        <form className="dashboard-calculator dashboard-bayes-form" onSubmit={(event) => void calculateBayes(event)}>
          <label>Probabilidad previa P(A)<input type="number" min="0" max="1" step="0.01" value={bayesValues.prior} onChange={(event) => setBayesValues({ ...bayesValues, prior: event.target.value })} required /></label>
          <label>Verosimilitud P(B|A)<input type="number" min="0" max="1" step="0.01" value={bayesValues.likelihood} onChange={(event) => setBayesValues({ ...bayesValues, likelihood: event.target.value })} required /></label>
          <label>Falso positivo P(B|¬A)<input type="number" min="0" max="1" step="0.01" value={bayesValues.falsePositive} onChange={(event) => setBayesValues({ ...bayesValues, falsePositive: event.target.value })} required /></label>
          <button type="submit" disabled={!canAnalyze || actionLoading}>{actionLoading ? 'Calculando…' : 'Calcular probabilidad'}</button>
          {previewMode && <small>Cálculo local de demostración; no se guarda en servidor.</small>}
          {!canAnalyze && <small>Se requiere rol de analista para guardar el cálculo.</small>}
          {actionError && <p role="alert">{actionError}</p>}
          {bayesResult && <div className="dashboard-calculation-result"><span>Probabilidad posterior <b>{(Number(bayesResult.result.probability_a_given_b) * 100).toLocaleString('es-PE', { maximumFractionDigits: 2 })}%</b></span><span>Probabilidad de evidencia <b>{(Number(bayesResult.result.probability_b) * 100).toLocaleString('es-PE', { maximumFractionDigits: 2 })}%</b></span></div>}
        </form>
      </article>
    </section>
    <section className="dashboard-module-grid dashboard-module-section" id="dashboard-section-insights" aria-label="Módulo de insights">
      <article className="content-card dashboard-module-panel dashboard-module-wide">
        <div className="card-header"><div><h2>Insights comerciales</h2><p>Observaciones explicables basadas en ventas completadas y filtros activos</p></div></div>
        <div className="dashboard-insight-list">{analytics.insights.map((insight) => <article key={insight.rule_code}>
          <span>{insight.rule_code.replaceAll('.', ' · ')}</span><strong>{insight.title}</strong><p>{insight.description}</p><small>{insight.evidence.sales_count} ventas · media {currency.format(insight.evidence.mean)} · mediana {currency.format(insight.evidence.median)}</small>
        </article>)}{!loading && analytics.insights.length === 0 && <p className="dashboard-empty">Los insights aparecerán cuando haya ventas completadas.</p>}</div>
      </article>
    </section>
  </div>
}

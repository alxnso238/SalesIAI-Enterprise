import { useEffect, useState } from 'react'
import { apiRequest, apiRoutes } from '../services/api'
import './dashboard.css'
import './reports-page.css'

type ReportData = {
  sales: { current: number; records: number }
  inventory: { quantity: number; records: number }
  sales_by_month: { month: string; total: number }[]
  sales_by_branch: { branch: string; total: number }[]
  sales_by_product: { product: string; total: number; quantity: number }[]
  inventory_rotation: { product: string; stock: number; sold_quantity: number; rotation: number }[]
  target_progress: { id: number; name: string; actual: number; goal: number; completion_percent: number; unit: string; period_active: boolean; branch?: string }[]
  recent_activity: { id: number; resource: string; label: string; created_at: string }[]
}
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })
const empty: ReportData = { sales: { current: 0, records: 0 }, inventory: { quantity: 0, records: 0 }, sales_by_month: [], sales_by_branch: [], sales_by_product: [], inventory_rotation: [], target_progress: [], recent_activity: [] }

function downloadCsv(report: ReportData) {
  const averageSale = report.sales.records ? report.sales.current / report.sales.records : 0
  const rows = [['Sección', 'Elemento', 'Valor'], ['Ticket promedio', 'General', String(averageSale)], ...report.sales_by_month.map(x => ['Ventas mensuales', x.month, String(x.total)]), ...report.sales_by_branch.map(x => ['Ventas por sucursal', x.branch, String(x.total)]), ...report.sales_by_product.map(x => ['Ventas por producto', x.product, String(x.total)]), ...report.inventory_rotation.map(x => ['Rotación', x.product, String(x.rotation)]), ...report.target_progress.map(x => ['Cumplimiento', x.name, `${x.completion_percent}%`])]
  const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `salesia-reportes-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const [report, setReport] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { apiRequest<ReportData>(apiRoutes.reports).then(setReport).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los reportes.')).finally(() => setLoading(false)) }, [])
  const maxMonth = Math.max(1, ...report.sales_by_month.map(x => x.total))
  const maxProduct = Math.max(1, ...report.sales_by_product.map(x => x.total))
  const maxBranch = Math.max(1, ...report.sales_by_branch.map(x => x.total))
  const averageSale = report.sales.records ? report.sales.current / report.sales.records : 0
  return <div className="dashboard-page reports-page">
    <div className="dashboard-heading"><div><div className="breadcrumb-line"><span>Inicio</span><span>/</span><b>Reportes</b></div><h1>Reportes empresariales</h1><p>Ventas, inventario, metas y actividad calculados desde datos persistidos.</p></div><div className="heading-actions"><button className="btn btn-outline" type="button" disabled={loading} onClick={() => downloadCsv(report)}>Exportar CSV</button></div></div>
    {error && <p className="dashboard-error" role="alert">{error}</p>}
    <section className="report-summary-grid"><article><span>Ventas registradas</span><strong>{loading ? '…' : money.format(report.sales.current)}</strong><small>{report.sales.records} transacciones</small></article><article><span>Ticket promedio</span><strong>{loading ? '…' : money.format(averageSale)}</strong><small>Importe promedio por venta</small></article><article><span>Inventario registrado</span><strong>{loading ? '…' : report.inventory.quantity.toLocaleString('es-PE')}</strong><small>{report.inventory.records} registros</small></article><article><span>Metas activas</span><strong>{loading ? '…' : report.target_progress.filter(x => x.period_active).length}</strong><small>{report.target_progress.length} metas definidas</small></article></section>
    <section className="report-grid">
      <article className="content-card"><div className="card-header"><div><h2>Ventas mensuales</h2><p>Importe de los últimos 12 meses</p></div></div><div className="report-month-chart" role="img" aria-label="Ventas por mes">{report.sales_by_month.map(item => <div className="report-month-column" key={item.month} title={`${item.month}: ${money.format(item.total)}`}><div className="report-month-bar" style={{ height: `${item.total ? Math.max(5, item.total / maxMonth * 100) : 2}%` }} /><span>{new Intl.DateTimeFormat('es', { month: 'short' }).format(new Date(`${item.month}-01T00:00:00`))}</span></div>)}</div>{!loading && !report.sales.records && <p className="report-empty-note">Sin ventas en el período. Registra ventas para activar el análisis temporal.</p>}</article>
      <article className="content-card"><div className="card-header"><div><h2>Ventas por sucursal</h2><p>Comparativo de ingresos</p></div></div><div className="report-bars">{report.sales_by_branch.map(item => <div className="report-bar-row" key={item.branch}><div><span>{item.branch}</span><b>{money.format(item.total)}</b></div><i><em style={{ width: `${Math.max(2, item.total / maxBranch * 100)}%` }} /></i></div>)}{!loading && !report.sales_by_branch.length && <p className="report-empty-note">No hay sucursales con ventas.</p>}</div></article>
      <article className="content-card"><div className="card-header"><div><h2>Ventas por producto</h2><p>Ingresos y unidades atribuidos</p></div></div><div className="report-bars">{report.sales_by_product.map(item => <div className="report-bar-row" key={item.product}><div><span>{item.product} · {item.quantity} uds.</span><b>{money.format(item.total)}</b></div><i><em className="cyan" style={{ width: `${Math.max(2, item.total / maxProduct * 100)}%` }} /></i></div>)}{!loading && !report.sales_by_product.length && <p className="report-empty-note">Incluye producto en ventas para habilitar este comparativo.</p>}</div></article>
      <article className="content-card"><div className="card-header"><div><h2>Rotación de inventario</h2><p>Unidades vendidas ÷ stock registrado</p></div></div><div className="report-table-wrap"><table><thead><tr><th>Producto</th><th>Stock</th><th>Vendidas</th><th>Rotación</th></tr></thead><tbody>{report.inventory_rotation.map(item => <tr key={item.product}><td>{item.product}</td><td>{item.stock}</td><td>{item.sold_quantity}</td><td>{item.rotation.toFixed(2)}×</td></tr>)}</tbody></table>{!loading && !report.inventory_rotation.length && <p className="report-empty-note">Registra productos para medir la rotación.</p>}</div></article>
      <article className="content-card report-targets"><div className="card-header"><div><h2>Cumplimiento de metas</h2><p>Ventas dentro del período objetivo</p></div></div><div className="report-bars">{report.target_progress.map(item => <div className="report-target-row" key={item.id}><div className="report-bar-row"><div><span>{item.name}{item.branch ? ` · ${item.branch}` : ''}</span><b>{item.completion_percent}%</b></div><i><em className={item.completion_percent >= 100 ? 'green' : ''} style={{ width: `${Math.min(100, item.completion_percent)}%` }} /></i></div><small>{money.format(item.actual)} / {money.format(item.goal)} · {item.period_active ? 'En curso' : 'Fuera de período'}</small></div>)}{!loading && !report.target_progress.length && <p className="report-empty-note">Crea metas en el módulo Metas para medir cumplimiento.</p>}</div></article>
      <article className="content-card"><div className="card-header"><div><h2>Actividad reciente</h2><p>Últimos registros del espacio de trabajo</p></div></div><div className="report-activity">{report.recent_activity.map(item => <div key={`${item.resource}-${item.id}`}><span>{item.resource}</span><strong>{item.label}</strong><time>{new Date(item.created_at).toLocaleString()}</time></div>)}{!loading && !report.recent_activity.length && <p className="report-empty-note">Todavía no hay actividad.</p>}</div></article>
    </section>
  </div>
}

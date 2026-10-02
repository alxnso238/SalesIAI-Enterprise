import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/useAuth'
import { apiRequest, apiRoutes } from '../services/api'
import './sales-page.css'

type SaleRecord = {
  id: number
  code: string
  branch: string
  customer: string
  amount: number
  status: string
  product?: string | null
  quantity?: number
}
type SaleDraft = Omit<SaleRecord, 'id'> & { id?: number }
type RecentActivity = { id: number; resource: string; label: string; created_at: string }
type SalesReport = {
  sales: { current: number; records: number }
  sales_by_month: { month: string; total: number }[]
  recent_activity: RecentActivity[]
}

const emptyReport: SalesReport = { sales: { current: 0, records: 0 }, sales_by_month: [], recent_activity: [] }
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })
const initialDraft: SaleDraft = { code: '', branch: '', customer: '', amount: 0, status: 'completed', product: '', quantity: 1 }

function exportSales(sales: SaleRecord[]) {
  const rows = [['Pedido', 'Sucursal', 'Cliente', 'Producto', 'Unidades', 'Importe', 'Estado'], ...sales.map((sale) => [sale.code, sale.branch, sale.customer, sale.product ?? '', String(sale.quantity ?? 1), String(sale.amount), sale.status])]
  const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `matrixflow-ventas-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function SalesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [report, setReport] = useState(emptyReport)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<SaleDraft | null>(null)
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      apiRequest<SaleRecord[]>(apiRoutes.sales),
      apiRequest<SalesReport>(apiRoutes.reports),
    ]).then(([saleRows, salesReport]) => {
      if (!active) return
      setSales([...saleRows].reverse())
      setReport(salesReport)
      setError('')
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las ventas.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [refresh])

  const filteredSales = sales.filter((sale) => `${sale.code} ${sale.branch} ${sale.customer} ${sale.product ?? ''} ${sale.status}`.toLowerCase().includes(query.toLowerCase()))
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthRevenue = report.sales_by_month.find((item) => item.month === currentMonth)?.total ?? 0
  const totalAmount = sales.reduce((total, sale) => total + sale.amount, 0)
  const completedAmount = sales.filter((sale) => ['completed', 'completada'].includes(sale.status.toLowerCase())).reduce((total, sale) => total + sale.amount, 0)
  const collectionRate = totalAmount ? completedAmount / totalAmount * 100 : 0
  const openAmount = sales.filter((sale) => !['completed', 'completada', 'cancelled', 'cancelada'].includes(sale.status.toLowerCase())).reduce((total, sale) => total + sale.amount, 0)
  const recentActivity = report.recent_activity.filter((activity) => activity.resource === 'sales').slice(0, 3)

  const saveSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form) return
    setSaving(true)
    setError('')
    setNotice('')
    const payload = {
      code: form.code.trim(),
      branch: form.branch.trim(),
      customer: form.customer.trim(),
      amount: Number(form.amount),
      status: form.status,
      ...(form.product?.trim() ? { product: form.product.trim(), quantity: Number(form.quantity) } : {}),
    }
    try {
      const url = form.id ? `${apiRoutes.resources}/sales/${form.id}` : apiRoutes.sales
      await apiRequest(url, { method: form.id ? 'PUT' : 'POST', body: JSON.stringify(payload) })
      setForm(null)
      setNotice(form.id ? 'Venta actualizada.' : 'Venta registrada.')
      setLoading(true)
      setRefresh((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la venta.')
    } finally {
      setSaving(false)
    }
  }

  const deleteSale = async (sale: SaleRecord) => {
    if (!window.confirm(`¿Eliminar el pedido ${sale.code}?`)) return
    setError('')
    try {
      await apiRequest(`${apiRoutes.resources}/sales/${sale.id}`, { method: 'DELETE' })
      setNotice(`Pedido ${sale.code} eliminado.`)
      setLoading(true)
      setRefresh((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar la venta.')
    }
  }

  const statusLabel = (status: string) => ({ completed: 'Completada', completada: 'Completada', pending: 'Pendiente', pendiente: 'Pendiente', cancelled: 'Cancelada', cancelada: 'Cancelada' })[status.toLowerCase()] ?? status
  const statusClass = (status: string) => ['completed', 'completada'].includes(status.toLowerCase()) ? 'completed' : ['pending', 'pendiente'].includes(status.toLowerCase()) ? 'pending' : 'cancelled'

  return <section className="sales-page">
    <div className="sales-heading"><div><div className="sales-breadcrumb"><span>Inicio</span><span>/</span><b>Ventas</b></div><h1>Ventas</h1><p>Registra y consulta cantidades e importes por sucursal.</p></div><button className="sales-primary" type="button" onClick={() => setForm({ ...initialDraft })}>＋ Nueva venta</button></div>
    {error && <p className="sales-message error" role="alert">{error}</p>}{notice && <p className="sales-message success" role="status">{notice}</p>}

    <section className="sales-overview" aria-label="Resumen ejecutivo de ventas">
      <div className="sales-summary"><span className="sales-eyebrow">RESUMEN EJECUTIVO</span><h2>Rendimiento general</h2><div className="sales-metrics">
        <article><span>Ingresos del mes</span><strong>{loading ? '…' : money.format(monthRevenue)}</strong><small>{report.sales.records} ventas registradas</small></article>
        <article><span>Ticket promedio</span><strong>{loading ? '…' : money.format(report.sales.records ? report.sales.current / report.sales.records : 0)}</strong><small>{report.sales.records} transacciones</small></article>
        <article><span>Cobranza</span><strong>{loading ? '…' : `${collectionRate.toFixed(1)}%`}</strong><small>{money.format(completedAmount)} completadas</small></article>
        <article><span>Ventas pendientes</span><strong>{loading ? '…' : money.format(openAmount)}</strong><small>{sales.filter((sale) => !['completed', 'completada', 'cancelled', 'cancelada'].includes(sale.status.toLowerCase())).length} pedidos abiertos</small></article>
      </div></div>
      <aside className="sales-activity"><span className="sales-eyebrow">OPERACIÓN</span><h2>Actividad reciente</h2><div className="sales-activity-list">{recentActivity.map((activity) => <article key={`${activity.resource}-${activity.id}`}><i /><div><strong>{activity.label}</strong><small>Venta registrada · {new Date(activity.created_at).toLocaleString('es-PE')}</small></div></article>)}{!loading && recentActivity.length === 0 && <p>Aún no hay actividad de ventas reciente.</p>}</div></aside>
    </section>

    <div className="sales-toolbar"><span><strong>{filteredSales.length}</strong> registros {query && `de ${sales.length}`}</span><div><label className="sales-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ventas…" aria-label="Buscar ventas" /></label><button className="sales-export" type="button" disabled={!sales.length} onClick={() => exportSales(filteredSales)}>↓ Exportar</button></div></div>
    <section className="sales-table-wrap"><table className="sales-table"><thead><tr><th>Pedido</th><th>Sucursal</th><th>Cliente</th><th>Importe</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filteredSales.map((sale) => <tr key={sale.id}><td className="sales-code">#{sale.code}</td><td>{sale.branch}</td><td>{sale.customer}</td><td>{money.format(sale.amount)}</td><td><span className={`sales-status ${statusClass(sale.status)}`}>{statusLabel(sale.status)}</span></td><td><div className="sales-row-actions"><button type="button" title="Ver venta" aria-label={`Ver venta ${sale.code}`} onClick={() => setSelectedSale(sale)}>◉</button>{isAdmin && <><button type="button" title="Editar venta" aria-label={`Editar venta ${sale.code}`} onClick={() => setForm({ ...sale, product: sale.product ?? '', quantity: sale.quantity ?? 1 })}>✎</button><button type="button" title="Eliminar venta" aria-label={`Eliminar venta ${sale.code}`} onClick={() => void deleteSale(sale)}>⌫</button></>}</div></td></tr>)}</tbody></table>
      {loading && <div className="sales-empty">Consultando ventas…</div>}{!loading && filteredSales.length === 0 && <div className="sales-empty">{sales.length ? 'No hay ventas que coincidan con la búsqueda.' : 'Todavía no hay ventas. Registra la primera para comenzar.'}</div>}
      <div className="sales-table-footer">Mostrando {filteredSales.length} de {sales.length} registros <span>Datos sincronizados con la API</span></div>
    </section>

    {form && <div className="sales-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setForm(null) }}><form className="sales-modal" role="dialog" aria-modal="true" aria-labelledby="sale-form-title" onSubmit={(event) => void saveSale(event)}><div className="sales-modal-heading"><div><span className="sales-eyebrow">REGISTRO COMERCIAL</span><h2 id="sale-form-title">{form.id ? 'Editar venta' : 'Nueva venta'}</h2></div><button type="button" aria-label="Cerrar" onClick={() => setForm(null)}>×</button></div><div className="sales-form-grid">
      <label>Pedido<input required minLength={2} maxLength={40} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
      <label>Sucursal<input required minLength={2} maxLength={120} value={form.branch} onChange={(event) => setForm({ ...form, branch: event.target.value })} /></label>
      <label>Cliente<input required minLength={2} maxLength={120} value={form.customer} onChange={(event) => setForm({ ...form, customer: event.target.value })} /></label>
      <label>Importe<input required type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} /></label>
      <label>Producto (opcional)<input maxLength={120} value={form.product ?? ''} onChange={(event) => setForm({ ...form, product: event.target.value })} /></label>
      <label>Unidades<input type="number" min="0.01" step="any" value={form.quantity ?? 1} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} /></label>
      {isAdmin && <label>Estado<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="completed">Completada</option><option value="pending">Pendiente</option><option value="cancelled">Cancelada</option></select></label>}
    </div><div className="sales-modal-actions"><button className="sales-secondary" type="button" onClick={() => setForm(null)}>Cancelar</button><button className="sales-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar venta'}</button></div></form></div>}
    {selectedSale && <div className="sales-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedSale(null) }}><section className="sales-modal sales-detail" role="dialog" aria-modal="true" aria-labelledby="sale-detail-title"><div className="sales-modal-heading"><div><span className="sales-eyebrow">DETALLE DEL PEDIDO</span><h2 id="sale-detail-title">#{selectedSale.code}</h2></div><button type="button" aria-label="Cerrar" onClick={() => setSelectedSale(null)}>×</button></div><dl><div><dt>Sucursal</dt><dd>{selectedSale.branch}</dd></div><div><dt>Cliente</dt><dd>{selectedSale.customer}</dd></div><div><dt>Importe</dt><dd>{money.format(selectedSale.amount)}</dd></div><div><dt>Estado</dt><dd>{statusLabel(selectedSale.status)}</dd></div>{selectedSale.product && <div><dt>Producto</dt><dd>{selectedSale.product} · {selectedSale.quantity ?? 1} uds.</dd></div>}</dl></section></div>}
  </section>
}
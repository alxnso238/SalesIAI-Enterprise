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
  items?: { product: string; quantity: number; unit_price: number }[]
  payments?: { payment_method: string; amount: number; status: string }[]
}
type SaleLineDraft = { product: string; quantity: number; unit_price: number }
type SaleDraft = { code: string; branch: string; customer: string; status: string; payment_method: string; items: SaleLineDraft[] }
type RecentActivity = { id: number; resource: string; label: string; created_at: string }
type SalesReport = {
  sales: { current: number; records: number }
  sales_by_month: { month: string; total: number }[]
  recent_activity: RecentActivity[]
}

const emptyReport: SalesReport = { sales: { current: 0, records: 0 }, sales_by_month: [], recent_activity: [] }
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })
const initialDraft: SaleDraft = { code: '', branch: '', customer: '', status: 'completed', payment_method: 'cash', items: [{ product: '', quantity: 1, unit_price: 0 }] }

function saleItemsLabel(sale: SaleRecord): string {
  if (sale.items?.length) return sale.items.map((item) => `${item.product} x ${item.quantity}`).join('; ')
  return sale.product ? `${sale.product} x ${sale.quantity ?? 1}` : ''
}

function exportSales(sales: SaleRecord[]) {
  const rows = [['Pedido', 'Sucursal', 'Cliente', 'Detalle', 'Importe', 'Estado'], ...sales.map((sale) => [sale.code, sale.branch, sale.customer, saleItemsLabel(sale), String(sale.amount), sale.status])]
  const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `salesia-ventas-${new Date().toISOString().slice(0, 10)}.csv`
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

  const filteredSales = sales.filter((sale) => `${sale.code} ${sale.branch} ${sale.customer} ${saleItemsLabel(sale)} ${sale.status}`.toLowerCase().includes(query.toLowerCase()))
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
    const items = form.items.map((item) => ({ ...item, product: item.product.trim() })).filter((item) => item.product)
    if (!items.length) {
      setError('Agrega al menos un producto a la venta.')
      setSaving(false)
      return
    }
    const amount = items.reduce((total, item) => total + item.quantity * item.unit_price, 0)
    const payload = {
      code: form.code.trim(),
      branch: form.branch.trim(),
      customer: form.customer.trim(),
      amount,
      status: form.status,
      items,
      payments: form.status === 'completed' && amount > 0
        ? [{ payment_method: form.payment_method, amount, status: 'completed' }]
        : [],
    }
    try {
      await apiRequest(apiRoutes.sales, { method: 'POST', body: JSON.stringify(payload) })
      setForm(null)
      setNotice('Venta registrada.')
      setLoading(true)
      setRefresh((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la venta.')
    } finally {
      setSaving(false)
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
    <section className="sales-table-wrap"><table className="sales-table"><thead><tr><th>Pedido</th><th>Sucursal</th><th>Cliente</th><th>Importe</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filteredSales.map((sale) => <tr key={sale.id}><td className="sales-code">#{sale.code}</td><td>{sale.branch}</td><td>{sale.customer}</td><td>{money.format(sale.amount)}</td><td><span className={`sales-status ${statusClass(sale.status)}`}>{statusLabel(sale.status)}</span></td><td><div className="sales-row-actions"><button type="button" title="Ver venta" aria-label={`Ver venta ${sale.code}`} onClick={() => setSelectedSale(sale)}>◉</button></div></td></tr>)}</tbody></table>
      {loading && <div className="sales-empty">Consultando ventas…</div>}{!loading && filteredSales.length === 0 && <div className="sales-empty">{sales.length ? 'No hay ventas que coincidan con la búsqueda.' : 'Todavía no hay ventas. Registra la primera para comenzar.'}</div>}
      <div className="sales-table-footer">Mostrando {filteredSales.length} de {sales.length} registros <span>Datos sincronizados con la API</span></div>
    </section>

    {form && <div className="sales-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setForm(null) }}><form className="sales-modal" role="dialog" aria-modal="true" aria-labelledby="sale-form-title" onSubmit={(event) => void saveSale(event)}><div className="sales-modal-heading"><div><span className="sales-eyebrow">REGISTRO COMERCIAL</span><h2 id="sale-form-title">Nueva venta</h2></div><button type="button" aria-label="Cerrar" onClick={() => setForm(null)}>×</button></div><div className="sales-form-grid">
      <label>Pedido<input required minLength={2} maxLength={40} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
      <label>Sucursal<input required minLength={2} maxLength={120} value={form.branch} onChange={(event) => setForm({ ...form, branch: event.target.value })} /></label>
      <label>Cliente<input required minLength={2} maxLength={120} value={form.customer} onChange={(event) => setForm({ ...form, customer: event.target.value })} /></label>
      <div className="sales-line-items"><div className="sales-line-items-heading"><strong>Detalle de productos</strong><button type="button" className="sales-export" onClick={() => setForm({ ...form, items: [...form.items, { product: '', quantity: 1, unit_price: 0 }] })}>＋ Agregar producto</button></div>{form.items.map((item, index) => <div className="sales-line-item" key={index}><label>Producto<input required minLength={2} maxLength={120} value={item.product} onChange={(event) => setForm({ ...form, items: form.items.map((line, lineIndex) => lineIndex === index ? { ...line, product: event.target.value } : line) })} /></label><label>Unidades<input required type="number" min="0.01" step="any" value={item.quantity} onChange={(event) => setForm({ ...form, items: form.items.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: Number(event.target.value) } : line) })} /></label><label>Precio unitario<input required type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => setForm({ ...form, items: form.items.map((line, lineIndex) => lineIndex === index ? { ...line, unit_price: Number(event.target.value) } : line) })} /></label>{form.items.length > 1 && <button type="button" className="sales-remove-line" aria-label={`Quitar producto ${index + 1}`} onClick={() => setForm({ ...form, items: form.items.filter((_, lineIndex) => lineIndex !== index) })}>×</button>}</div>)}<div className="sales-line-total"><span>Total de venta</span><strong>{money.format(form.items.reduce((total, item) => total + item.quantity * item.unit_price, 0))}</strong></div></div>
      {form.status === 'completed' && <label>Método de pago<select value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })}><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="other">Otro</option></select></label>}
      {isAdmin && <label>Estado<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="completed">Completada</option><option value="pending">Pendiente</option><option value="cancelled">Cancelada</option></select></label>}
    </div><div className="sales-modal-actions"><button className="sales-secondary" type="button" onClick={() => setForm(null)}>Cancelar</button><button className="sales-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar venta'}</button></div></form></div>}
    {selectedSale && <div className="sales-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedSale(null) }}><section className="sales-modal sales-detail" role="dialog" aria-modal="true" aria-labelledby="sale-detail-title"><div className="sales-modal-heading"><div><span className="sales-eyebrow">DETALLE DEL PEDIDO</span><h2 id="sale-detail-title">#{selectedSale.code}</h2></div><button type="button" aria-label="Cerrar" onClick={() => setSelectedSale(null)}>×</button></div><dl><div><dt>Sucursal</dt><dd>{selectedSale.branch}</dd></div><div><dt>Cliente</dt><dd>{selectedSale.customer}</dd></div><div><dt>Importe</dt><dd>{money.format(selectedSale.amount)}</dd></div><div><dt>Estado</dt><dd>{statusLabel(selectedSale.status)}</dd></div>{selectedSale.items?.length ? selectedSale.items.map((item, index) => <div key={`${item.product}-${index}`}><dt>Producto</dt><dd>{item.product} · {item.quantity} uds. × {money.format(item.unit_price)}</dd></div>) : selectedSale.product && <div><dt>Producto</dt><dd>{selectedSale.product} · {selectedSale.quantity ?? 1} uds.</dd></div>}{selectedSale.payments?.map((payment, index) => <div key={`${payment.payment_method}-${index}`}><dt>Pago · {payment.payment_method}</dt><dd>{money.format(payment.amount)} · {payment.status}</dd></div>)}</dl></section></div>}
  </section>
}
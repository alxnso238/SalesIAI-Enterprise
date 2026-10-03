import { useEffect, useState } from 'react'
import { apiRequest, apiRoutes } from '../services/api'
import './module-page.css'
import './history-page.css'

type AuditRecord = { id: number; action: string; module: string; entity_type: string | null; entity_id: number | null; status: string; user_email: string | null; ip_address: string | null; details: Record<string, unknown> | null; created_at: string }

export function HistoryPage() {
  const [rows, setRows] = useState<AuditRecord[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { apiRequest<AuditRecord[]>(apiRoutes.audit).then(setRows).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo consultar la auditoría.')).finally(() => setLoading(false)) }, [])
  const filtered = rows.filter(record => `${record.id} ${record.action} ${record.module} ${record.status} ${record.user_email ?? ''} ${JSON.stringify(record.details)}`.toLowerCase().includes(query.toLowerCase()))
  const exportCsv = () => {
    const csvRows = [['ID', 'Acción', 'Módulo', 'Entidad', 'Estado', 'Usuario', 'IP', 'Fecha', 'Detalles'], ...filtered.map(row => [String(row.id), row.action, row.module, `${row.entity_type ?? ''} ${row.entity_id ?? ''}`.trim(), row.status, row.user_email ?? '', row.ip_address ?? '', row.created_at, JSON.stringify(row.details ?? {})])]
    const csv = csvRows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'salesia-historial.csv'; link.click(); URL.revokeObjectURL(url)
  }
  return <section className="module-page history-page">
    <div className="module-heading"><div><div className="breadcrumb-line"><span>Inicio</span><span>/</span><b>Auditoría</b></div><h1>Auditoría del sistema</h1><p>Acciones administrativas y cambios persistidos en el espacio.</p></div><button className="module-cancel" type="button" disabled={!rows.length} onClick={exportCsv}>Exportar CSV</button></div>
    {error && <p className="module-error" role="alert">{error}</p>}
    <div className="module-toolbar"><div className="module-count"><strong>{filtered.length}</strong> eventos</div><div className="module-actions"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar acción, módulo o usuario…" aria-label="Buscar auditoría" /></div></div>
    <div className="module-card"><div className="module-table-wrap"><table className="module-table"><thead><tr><th>Acción</th><th>Módulo</th><th>Entidad</th><th>Estado</th><th>Usuario</th><th>Fecha</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td>{row.action}</td><td>{row.module}</td><td>{row.entity_type ? `${row.entity_type} ${row.entity_id ?? ''}` : '—'}</td><td><span className={`history-status ${row.status === 'success' ? 'success' : ''}`}>{row.status}</span></td><td>{row.user_email ?? 'Sistema'}</td><td>{new Date(row.created_at).toLocaleString()}</td></tr>)}</tbody></table>{loading && <div className="module-empty">Consultando auditoría…</div>}{!loading && !filtered.length && <div className="module-empty">No hay eventos que coincidan.</div>}</div><div className="module-card-footer">Eventos de auditoría persistidos · {filtered.length} de {rows.length}</div></div>
  </section>
}

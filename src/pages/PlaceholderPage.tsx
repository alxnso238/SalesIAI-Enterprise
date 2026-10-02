import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { apiRequest, apiRoutes } from '../services/api'
import './module-page.css'
import './configuration-page.css'

type Row = Record<string, string>
type ModuleConfig = {
  title: string
  description: string
  singular: string
  collection?: string
  columns: { key: string; label: string }[]
  readOnly?: boolean
  showHistory?: boolean
}
type AuditEntry = { id: number; action: string; module: string; entity_id: number | null; status: string; user_email: string | null; created_at: string }

const modules: Record<string, ModuleConfig> = {
  empresa: { title: 'Empresa', description: 'Información corporativa.', singular: 'empresa', collection: 'companies', columns: [{ key: 'name', label: 'Razón social' }, { key: 'tax_id', label: 'Identificación fiscal' }, { key: 'city', label: 'Ciudad' }, { key: 'status', label: 'Estado' }] },
  categorias: { title: 'Categorías', description: 'Clasificación del catálogo de productos.', singular: 'categoría', collection: 'categories', columns: [{ key: 'name', label: 'Categoría' }, { key: 'description', label: 'Descripción' }] },
  sucursales: { title: 'Sucursales', description: 'Sedes y responsables.', singular: 'sucursal', collection: 'branches', columns: [{ key: 'name', label: 'Sucursal' }, { key: 'city', label: 'Ciudad' }, { key: 'manager', label: 'Responsable' }, { key: 'code', label: 'Código' }] },
  productos: { title: 'Productos', description: 'Catálogo y existencias.', singular: 'producto', collection: 'products', columns: [{ key: 'name', label: 'Producto' }, { key: 'category', label: 'Categoría' }, { key: 'price', label: 'Precio' }, { key: 'stock', label: 'Stock' }] },
  ventas: { title: 'Ventas', description: 'Transacciones registradas.', singular: 'venta', collection: 'sales', columns: [{ key: 'code', label: 'Pedido' }, { key: 'branch', label: 'Sucursal' }, { key: 'customer', label: 'Cliente' }, { key: 'product', label: 'Producto (opcional)' }, { key: 'quantity', label: 'Unidades' }, { key: 'amount', label: 'Importe' }, { key: 'status', label: 'Estado' }] },
  inventario: { title: 'Inventario', description: 'Existencias y movimientos.', singular: 'movimiento', collection: 'inventory', columns: [{ key: 'product', label: 'Producto' }, { key: 'branch', label: 'Sucursal' }, { key: 'quantity', label: 'Cantidad' }, { key: 'movement', label: 'Movimiento' }] },
  metas: { title: 'Metas', description: 'Objetivos comerciales por período, sucursal o producto.', singular: 'meta', collection: 'targets', columns: [{ key: 'name', label: 'Meta' }, { key: 'period_start', label: 'Desde (AAAA-MM-DD)' }, { key: 'period_end', label: 'Hasta (AAAA-MM-DD)' }, { key: 'target_amount', label: 'Importe objetivo' }, { key: 'target_quantity', label: 'Unidades objetivo' }, { key: 'branch', label: 'Sucursal (opcional)' }, { key: 'product', label: 'Producto (opcional)' }] },
  configuracion: { title: 'Configuración', description: 'Parámetros del espacio de trabajo con historial de cambios.', singular: 'configuración', collection: 'configurations', showHistory: true, columns: [{ key: 'name', label: 'Parámetro' }, { key: 'value', label: 'Valor' }] },
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

export function PlaceholderPage() {
  const location = useLocation()
  const key = location.pathname.split('/')[1] || 'empresa'
  const config = modules[key]
  if (!config) return <section className="empty-page"><span className="eyebrow">MÓDULO MATRIXFLOW</span><h1>Página no encontrada</h1><p>La ruta solicitada no existe.</p></section>
  return <ModulePage key={key} config={config} />
}

function ModulePage({ config }: { config: ModuleConfig }) {
  const [rows, setRows] = useState<Row[]>([])
  const [editing, setEditing] = useState<Row | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [configurationHistory, setConfigurationHistory] = useState<AuditEntry[]>([])

  useEffect(() => {
    let active = true
    const request = config.collection
      ? apiRequest<Record<string, unknown>[]>(`${apiRoutes.resources}/${config.collection}`)
        .then((records) => records.map((record) => Object.fromEntries(Object.entries(record).map(([key, value]) => [key, displayValue(value)]))))
      : Promise.resolve([])

    void request.then((loadedRows) => {
      if (active) {
        setRows(loadedRows)
        setError('')
      }
    }).catch((requestError: unknown) => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los datos.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [config.collection, refresh])

  useEffect(() => {
    if (!config.showHistory) return
    let active = true
    void apiRequest<AuditEntry[]>(apiRoutes.audit).then((events) => {
      if (active) setConfigurationHistory(events.filter((event) => event.module === config.collection))
    }).catch((requestError: unknown) => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el historial de configuración.')
    })
    return () => { active = false }
  }, [config.collection, config.showHistory, refresh])

  const filteredRows = rows.filter((row) => Object.values(row).some((value) => value.toLowerCase().includes(query.toLowerCase())))

  const saveRow = async () => {
    if (!editing || !config.collection) return
    const payload: Record<string, unknown> = {}
    for (const [key, rawValue] of Object.entries(editing)) {
      if (key === 'id') continue
      if (['target_amount', 'target_quantity', 'product'].includes(key) && rawValue === '') continue
      if (['price', 'stock', 'amount', 'quantity', 'target_amount', 'target_quantity'].includes(key)) {
        payload[key] = rawValue === '' ? 0 : Number(rawValue)
      } else if (['values', 'result'].includes(key) && rawValue.startsWith('[')) {
        try { payload[key] = JSON.parse(rawValue) } catch { payload[key] = rawValue }
      } else {
        payload[key] = rawValue
      }
    }
    try {
      const recordId = editing.id
      const endpoint = `${apiRoutes.resources}/${config.collection}${recordId ? `/${recordId}` : ''}`
      await apiRequest(endpoint, { method: recordId ? 'PUT' : 'POST', body: JSON.stringify(payload) })
      setEditing(null)
      setLoading(true)
      setRefresh((value) => value + 1)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo guardar el registro.')
    }
  }

  const removeRow = async (id: string) => {
    if (!config.collection) return
    try {
      await apiRequest(`${apiRoutes.resources}/${config.collection}/${id}`, { method: 'DELETE' })
      setLoading(true)
      setRefresh((value) => value + 1)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo eliminar el registro.')
    }
  }

  const startNew = () => setEditing(Object.fromEntries(config.columns.map((column) => [column.key, ''])))
  const canEdit = Boolean(config.collection && !config.readOnly)
  const actionLabels: Record<string, string> = { create: 'Creación', update: 'Edición', delete: 'Eliminación' }

  return <section className="module-page">
    <div className="module-heading"><div><div className="breadcrumb-line"><span>Inicio</span><span>/</span><b>{config.title}</b></div><h1>{config.title}</h1><p>{config.description}</p></div>{canEdit && <button className="module-primary" onClick={startNew}>＋ Nueva {config.singular}</button>}</div>
    {config.showHistory && <aside className="configuration-guide" aria-labelledby="configuration-guide-title"><strong id="configuration-guide-title">Cómo usar la configuración</strong><ol><li>Selecciona «Nueva configuración» para guardar una clave y su valor.</li><li>Usa los controles de la tabla para editar o eliminar un parámetro.</li><li>Los cambios aparecen en el historial inferior con usuario y fecha.</li></ol></aside>}
    <div className="module-toolbar"><div className="module-count"><strong>{rows.length}</strong> registros</div><div className="module-actions"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${config.title.toLowerCase()}...`} aria-label={`Buscar ${config.title}`} /></div></div>
    {error && <p role="alert" className="module-error">{error}</p>}
    <div className="module-card"><div className="module-table-wrap"><table className="module-table"><thead><tr>{config.columns.map((column) => <th key={column.key}>{column.label}</th>)}{canEdit && <th className="actions-column">Acciones</th>}</tr></thead><tbody>
      {filteredRows.map((row) => <tr key={row.id ?? row.metric ?? `${row.operation}-${row.executed_at}`}>{config.columns.map((column) => <td key={column.key}>{row[column.key]}</td>)}{canEdit && <td className="row-actions"><button onClick={() => setEditing({ ...row })} aria-label={`Editar ${config.singular}`}>✎</button><button onClick={() => void removeRow(row.id)} aria-label={`Eliminar ${config.singular}`}>⌫</button></td>}</tr>)}
    </tbody></table>{loading ? <div className="module-empty">Consultando el servidor...</div> : filteredRows.length === 0 && <div className="module-empty">{config.collection ? 'No hay datos persistidos todavía.' : 'Este módulo aún no tiene un endpoint de datos.'}</div>}</div><div className="module-card-footer">Mostrando {filteredRows.length} de {rows.length} registros <span>{config.collection ? 'Sincronizado con Supabase vía FastAPI' : 'Módulo pendiente de integración'}</span></div></div>
    {config.showHistory && <section className="configuration-history" aria-labelledby="configuration-history-title"><div className="module-heading"><div><span className="eyebrow">TRAZABILIDAD</span><h2 id="configuration-history-title">Historial de configuración</h2><p>{configurationHistory.length} cambios registrados</p></div></div><div className="module-card"><div className="module-table-wrap"><table className="module-table"><thead><tr><th>Acción</th><th>Registro</th><th>Usuario</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>{configurationHistory.map((event) => <tr key={event.id}><td>{actionLabels[event.action] ?? event.action}</td><td>{event.entity_id ? `Parámetro #${event.entity_id}` : '—'}</td><td>{event.user_email ?? 'Sistema'}</td><td>{new Date(event.created_at).toLocaleString()}</td><td>{event.status}</td></tr>)}</tbody></table>{!configurationHistory.length && <div className="module-empty">Todavía no hay cambios de configuración.</div>}</div><div className="module-card-footer">El historial registra altas, ediciones y eliminaciones.</div></div></section>}
    {editing && canEdit && <div className="module-form-card"><div className="module-form-heading"><div><span className="eyebrow">REGISTRO PERSISTENTE</span><h2>{editing.id ? `Editar ${config.singular}` : `Nueva ${config.singular}`}</h2></div><button onClick={() => setEditing(null)} aria-label="Cerrar formulario">×</button></div><div className="module-form-grid">{config.columns.map((column) => <label key={column.key}>{column.label}{['values'].includes(column.key) ? <textarea rows={3} placeholder="[1, 2, 3] o [[1, 2], [3, 4]]" value={editing[column.key] || ''} onChange={(event) => setEditing({ ...editing, [column.key]: event.target.value })} /> : <input type={['amount', 'quantity', 'price', 'stock', 'target_amount', 'target_quantity'].includes(column.key) ? 'number' : ['period_start', 'period_end'].includes(column.key) ? 'date' : 'text'} step={['amount', 'price', 'target_amount', 'target_quantity'].includes(column.key) ? 'any' : undefined} required={!(config.collection === 'targets' && ['target_amount', 'target_quantity', 'branch', 'product'].includes(column.key)) && !(config.collection === 'sales' && column.key === 'product')} value={editing[column.key] || ''} onChange={(event) => setEditing({ ...editing, [column.key]: event.target.value })} />}</label>)}</div><div className="module-form-actions"><button className="module-cancel" onClick={() => setEditing(null)}>Cancelar</button><button className="module-primary" onClick={() => void saveRow()}>Guardar</button></div></div>}
  </section>
}

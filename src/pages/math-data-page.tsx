import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/useAuth'
import { apiRequest, apiRoutes } from '../services/api'
import './module-page.css'
import './math-data-page.css'

type MathKind = 'vectors' | 'matrices'
type MathRecord = { id: number; name: string; values: number[] | number[][]; source: string }
type Props = { kind: MathKind }
const cloneGrid = (grid: number[][]) => grid.map(row => [...row])

export function MathDataPage({ kind }: Props) {
  const { user } = useAuth()
  const canManage = user?.role === 'admin'
  const isMatrix = kind === 'matrices'
  const title = isMatrix ? 'Matrices' : 'Vectores'
  const [records, setRecords] = useState<MathRecord[]>([])
  const [name, setName] = useState('')
  const [vector, setVector] = useState<number[]>([0, 0, 0])
  const [matrix, setMatrix] = useState<number[][]>([[0, 0, 0], [0, 0, 0], [0, 0, 0]])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const endpoint = `${apiRoutes.resources}/${kind}`

  const reload = async () => {
    setLoading(true)
    try { setRecords(await apiRequest<MathRecord[]>(endpoint)); setError('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : `No se pudieron cargar ${title.toLowerCase()}.`) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    let active = true
    void apiRequest<MathRecord[]>(endpoint).then(records => {
      if (active) { setRecords(records); setError('') }
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : `No se pudieron cargar ${title.toLowerCase()}.`)
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [endpoint, title])

  const reset = () => {
    setName(''); setEditingId(null); setVector([0, 0, 0]); setMatrix([[0, 0, 0], [0, 0, 0], [0, 0, 0]])
  }
  const editRecord = (record: MathRecord) => {
    setName(record.name); setEditingId(record.id)
    if (isMatrix) setMatrix(cloneGrid(record.values as number[][]))
    else setVector([...(record.values as number[])])
    setNotice('')
  }
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    const values = isMatrix ? matrix : vector
    if (isMatrix && (matrix.length === 0 || matrix[0].length === 0 || matrix.some(row => row.length !== matrix[0].length))) {
      setError('La matriz debe tener filas y columnas completas.'); setSaving(false); return
    }
    try {
      await apiRequest<MathRecord>(`${endpoint}${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({ name: name.trim(), values, source: 'manual' }),
      })
      setNotice(`${title.slice(0, -1)} ${editingId ? 'actualizado' : 'guardado'} en Supabase.`)
      reset(); await reload()
    } catch (cause) { setError(cause instanceof Error ? cause.message : `No se pudo guardar ${title.toLowerCase()}.`) }
    finally { setSaving(false) }
  }
  const remove = async (record: MathRecord) => {
    if (!window.confirm(`¿Eliminar ${record.name}?`)) return
    try { await apiRequest(`${endpoint}/${record.id}`, { method: 'DELETE' }); setNotice(`${record.name} eliminado.`); await reload() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el registro.') }
  }
  const setCell = (row: number, column: number, value: string) => {
    setMatrix(current => current.map((cells, rowIndex) => rowIndex === row ? cells.map((cell, columnIndex) => columnIndex === column ? (value === '' ? 0 : Number(value)) : cell) : cells))
  }
  const addColumn = () => setMatrix(current => current.map(row => [...row, 0]))
  const removeColumn = () => setMatrix(current => current.map(row => row.length > 1 ? row.slice(0, -1) : row))
  const addRow = () => setMatrix(current => [...current, Array(current[0]?.length ?? 1).fill(0)])
  const removeRow = () => setMatrix(current => current.length > 1 ? current.slice(0, -1) : current)

  return <section className="module-page math-data-page">
    <div className="module-heading"><div><div className="breadcrumb-line"><span>Inicio</span><span>/</span><b>{title}</b></div><h1>{isMatrix ? 'Editor de matrices' : 'Editor de vectores'}</h1><p>Captura estructurada con persistencia en Supabase para análisis y operaciones.</p></div></div>
    {error && <p className="module-error" role="alert">{error}</p>}{notice && <p className="math-data-notice" role="status">{notice}</p>}
    <form className="module-form-card math-editor" onSubmit={save}>
      <div className="module-form-heading"><div><span className="eyebrow">{isMatrix ? `${matrix.length} × ${matrix[0]?.length ?? 0}` : `${vector.length} COMPONENTES`}</span><h2>{editingId ? 'Editar' : 'Nuevo'} {isMatrix ? 'matriz' : 'vector'}</h2></div></div>
      <label className="math-name-field">Nombre<input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder={isMatrix ? 'Ventas por sucursal' : 'Ventas mensuales'} /></label>
      {isMatrix ? <div className="matrix-editor-wrap"><table className="matrix-editor"><tbody>{matrix.map((row, rowIndex) => <tr key={rowIndex}>{row.map((value, columnIndex) => <td key={columnIndex}><label className="sr-only">Fila {rowIndex + 1}, columna {columnIndex + 1}</label><input aria-label={`Fila ${rowIndex + 1}, columna ${columnIndex + 1}`} type="number" step="any" value={value} onChange={event => setCell(rowIndex, columnIndex, event.target.value)} /></td>)}</tr>)}</tbody></table><div className="math-editor-tools"><button type="button" className="module-cancel" onClick={addRow}>＋ Fila</button><button type="button" className="module-cancel" onClick={removeRow} disabled={matrix.length <= 1}>− Fila</button><button type="button" className="module-cancel" onClick={addColumn}>＋ Columna</button><button type="button" className="module-cancel" onClick={removeColumn} disabled={(matrix[0]?.length ?? 0) <= 1}>− Columna</button></div></div> : <div className="vector-editor">{vector.map((value, index) => <label key={index}><span>v{index + 1}</span><input aria-label={`Componente ${index + 1}`} type="number" step="any" value={value} onChange={event => setVector(current => current.map((item, itemIndex) => itemIndex === index ? (event.target.value === '' ? 0 : Number(event.target.value)) : item))} /><button type="button" aria-label={`Eliminar componente ${index + 1}`} disabled={vector.length <= 1} onClick={() => setVector(current => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></label>)}<button type="button" className="module-cancel" onClick={() => setVector(current => [...current, 0])}>＋ Añadir componente</button></div>}
      <div className="module-form-actions">{editingId && <button type="button" className="module-cancel" onClick={reset}>Cancelar edición</button>}<button className="module-primary" disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : `Guardar ${isMatrix ? 'matriz' : 'vector'}`}</button></div>
    </form>
    <div className="module-toolbar"><div className="module-count"><strong>{records.length}</strong> {isMatrix ? 'matrices' : 'vectores'} persistidos</div></div>
    <div className="module-card"><div className="module-table-wrap"><table className="module-table"><thead><tr><th>Nombre</th><th>Dimensiones</th><th>Valores</th>{canManage && <th>Acciones</th>}</tr></thead><tbody>{records.map(record => <tr key={record.id}><td>{record.name}</td><td>{isMatrix ? `${(record.values as number[][]).length} × ${(record.values as number[][])[0]?.length ?? 0}` : `${(record.values as number[]).length} componentes`}</td><td><code>{JSON.stringify(record.values)}</code></td>{canManage && <td className="math-record-actions"><button type="button" onClick={() => editRecord(record)} aria-label={`Editar ${record.name}`}>Editar</button><button type="button" onClick={() => void remove(record)} aria-label={`Eliminar ${record.name}`}>Eliminar</button></td>}</tr>)}</tbody></table>{loading && <div className="module-empty">Consultando Supabase…</div>}{!loading && records.length === 0 && <div className="module-empty">Todavía no hay {title.toLowerCase()} guardados.</div>}</div><div className="module-card-footer">Valores persistidos y disponibles para ejecutar operaciones.</div></div>
  </section>
}

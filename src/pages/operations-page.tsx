import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest, apiRoutes } from '../services/api'
import './module-page.css'
import './operations-page.css'

type OperationName = 'sum_vector' | 'subtract_vector' | 'scalar_multiply' | 'dot_product' | 'linear_combination' | 'add_matrix' | 'subtract_matrix' | 'multiply_matrix' | 'transpose_matrix' | 'scalar_multiply_matrix'
type OperationRecord = { id: number; operation: OperationName; result: number | number[] | number[][]; status: string; executed_at: string }
type OperationMode = 'operations' | 'linear-combination'
const options: { value: OperationName; label: string }[] = [
  { value: 'sum_vector', label: 'Suma de vectores' }, { value: 'subtract_vector', label: 'Resta de vectores' },
  { value: 'scalar_multiply', label: 'Multiplicación escalar de vector' }, { value: 'dot_product', label: 'Producto punto' },
  { value: 'linear_combination', label: 'Combinación lineal' }, { value: 'add_matrix', label: 'Suma de matrices' },
  { value: 'subtract_matrix', label: 'Resta de matrices' }, { value: 'multiply_matrix', label: 'Multiplicación de matrices' },
  { value: 'transpose_matrix', label: 'Transpuesta de matriz' }, { value: 'scalar_multiply_matrix', label: 'Multiplicación escalar de matriz' },
]
const binary = new Set<OperationName>(['sum_vector', 'subtract_vector', 'dot_product', 'add_matrix', 'subtract_matrix', 'multiply_matrix'])
const scalarOps = new Set<OperationName>(['scalar_multiply', 'scalar_multiply_matrix'])
const matrixOps = new Set<OperationName>(['add_matrix', 'subtract_matrix', 'multiply_matrix', 'transpose_matrix', 'scalar_multiply_matrix'])
const historyUrl = `${apiRoutes.resources}/operations`

function parseJson(value: string, field: string) {
  try { return JSON.parse(value) as unknown } catch { throw new Error(`${field} debe ser JSON válido.`) }
}

export function OperationsPage({ mode = 'operations' }: { mode?: OperationMode }) {
  const initialOperation: OperationName = mode === 'linear-combination' ? 'linear_combination' : 'dot_product'
  const [operation, setOperation] = useState<OperationName>(initialOperation)
  const [data, setData] = useState(initialOperation === 'linear_combination' ? '[[1, 2], [3, 4]]' : '[1, 2]')
  const [other, setOther] = useState('[3, 4]')
  const [scalar, setScalar] = useState('2')
  const [weights, setWeights] = useState('[1, 1]')
  const [history, setHistory] = useState<OperationRecord[]>([])
  const [result, setResult] = useState<OperationRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const isMatrix = matrixOps.has(operation)
  const isCombination = operation === 'linear_combination'

  const changeOperation = (next: OperationName) => {
    setOperation(next)
    setData(matrixOps.has(next) || next === 'linear_combination' ? '[[1, 2], [3, 4]]' : '[1, 2]')
    setOther(matrixOps.has(next) ? '[[5, 6], [7, 8]]' : '[3, 4]')
  }

  useEffect(() => {
    let active = true
    void apiRequest<OperationRecord[]>(historyUrl).then((records) => { if (active) setHistory(records.reverse()) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el historial.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const runOperation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setResult(null); setRunning(true)
    try {
      const payload: Record<string, unknown> = { operation, data: parseJson(data, 'Los datos') }
      if (binary.has(operation)) payload.other = parseJson(other, 'El segundo operando')
      if (scalarOps.has(operation)) {
        const numericScalar = Number(scalar)
        if (!Number.isFinite(numericScalar)) throw new Error('El escalar debe ser un número válido.')
        payload.scalar = numericScalar
      }
      if (isCombination) payload.weights = parseJson(weights, 'Los pesos')
      const saved = await apiRequest<OperationRecord>(apiRoutes.operations, { method: 'POST', body: JSON.stringify(payload) })
      setResult(saved); setHistory((records) => [saved, ...records])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo ejecutar la operación.') }
    finally { setRunning(false) }
  }

  return <section className="module-page">
    <div className="module-heading"><div><div className="breadcrumb-line"><span>Inicio</span><span>/</span><b>Operaciones</b></div><h1>{isCombination ? 'Combinaciones lineales' : 'Operaciones matemáticas'}</h1><p>Los resultados se guardan en Supabase y aparecen en el historial.</p></div></div>
    <form className="operation-form" onSubmit={runOperation}>
      <label className="operation-field">Operación<select value={operation} onChange={(event) => changeOperation(event.target.value as OperationName)}>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <div className="operation-fields">
        <label className="operation-field">{isCombination ? 'Vectores (matriz JSON)' : isMatrix ? 'Matriz' : 'Vector'}<textarea rows={4} value={data} onChange={(event) => setData(event.target.value)} placeholder={isMatrix || isCombination ? '[[1, 2], [3, 4]]' : '[1, 2]'} /></label>
        {binary.has(operation) && <label className="operation-field">{isMatrix ? 'Segunda matriz' : 'Segundo vector'}<textarea rows={4} value={other} onChange={(event) => setOther(event.target.value)} placeholder={isMatrix ? '[[5, 6], [7, 8]]' : '[3, 4]'} /></label>}
        {scalarOps.has(operation) && <label className="operation-field">Escalar<input type="number" step="any" value={scalar} onChange={(event) => setScalar(event.target.value)} /></label>}
        {isCombination && <label className="operation-field">Pesos (arreglo JSON)<textarea rows={3} value={weights} onChange={(event) => setWeights(event.target.value)} placeholder="[1, 1]" /></label>}
      </div>
      {error && <p className="module-error" role="alert">{error}</p>}
      <div className="operation-form-actions"><button className="module-primary" type="submit" disabled={running}>{running ? 'Calculando…' : 'Ejecutar y guardar'}</button></div>
    </form>
    {result && <section className="operation-result" aria-live="polite"><div><span>Resultado guardado · #{result.id}</span><strong>{options.find((item) => item.value === result.operation)?.label}</strong></div><pre>{JSON.stringify(result.result, null, 2)}</pre></section>}
    <div className="module-toolbar operation-history-heading"><div className="module-count"><strong>{history.length}</strong> operaciones guardadas</div></div>
    <div className="module-card"><div className="module-table-wrap"><table className="module-table"><thead><tr><th>Operación</th><th>Resultado</th><th>Estado</th><th>Ejecutada</th></tr></thead><tbody>
      {history.map((record) => <tr key={record.id}><td>{options.find((item) => item.value === record.operation)?.label ?? record.operation}</td><td><code>{JSON.stringify(record.result)}</code></td><td>{record.status}</td><td>{new Date(record.executed_at).toLocaleString()}</td></tr>)}
    </tbody></table>{!loading && history.length === 0 && <div className="module-empty">Todavía no hay operaciones guardadas.</div>}</div>{loading && <div className="module-empty">Consultando el historial...</div>}<div className="module-card-footer">Resultados persistidos en Supabase</div></div>
  </section>
}

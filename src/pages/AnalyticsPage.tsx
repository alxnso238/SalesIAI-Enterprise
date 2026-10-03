import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest, apiRoutes } from '../services/api'
import './analytics-page.css'

type MonthlySale = { month: string; total: number }
type ProductSale = { product: string; revenue: number; quantity: number }
type FilterOptions = { branches: string[]; sellers: string[]; categories: string[] }
type AnalyticsReport = {
  sales_count: number
  total_revenue: number
  average_sale: number
  median_sale: number
  average_quantity: number
  sales_by_month: MonthlySale[]
  sales_by_product: ProductSale[]
  insights: { rule_code: string; title: string; description: string; severity: string; evidence: { sales_count: number; mean: number; median: number } }[]
  filter_options: FilterOptions
}
type AnalysisResult = Record<string, number | string>
type AnalysisRecord = {
  id: number
  operation: string
  inputs: Record<string, unknown>
  result: AnalysisResult
  created_at: string
}
type AnalysisMode = 'mean' | 'median' | 'compare' | 'random_variable'

const emptyReport: AnalyticsReport = {
  sales_count: 0,
  total_revenue: 0,
  average_sale: 0,
  median_sale: 0,
  average_quantity: 0,
  sales_by_month: [],
  sales_by_product: [],
  insights: [],
  filter_options: { branches: [], sellers: [], categories: [] },
}
const currency = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 2 })
const modes: { id: AnalysisMode; label: string; endpoint: string }[] = [
  { id: 'mean', label: 'Media', endpoint: apiRoutes.statistics.mean },
  { id: 'median', label: 'Mediana', endpoint: apiRoutes.statistics.median },
  { id: 'compare', label: 'Comparar', endpoint: apiRoutes.statistics.compare },
  { id: 'random_variable', label: 'Variable', endpoint: apiRoutes.statistics.randomVariable },
]

export function AnalyticsPage() {
  const [report, setReport] = useState(emptyReport)
  const [filters, setFilters] = useState({ date_from: '', date_to: '', branch: '', seller: '', category: '' })
  const [history, setHistory] = useState<AnalysisRecord[]>([])
  const [mode, setMode] = useState<AnalysisMode>('compare')
  const [values, setValues] = useState('')
  const [variable, setVariable] = useState({ name: 'Monto de venta', variable_type: 'continua' as 'discreta' | 'continua' })
  const [bayesValues, setBayesValues] = useState({ prior: '0.5', likelihood: '0.8', falsePositive: '0.2' })
  const [result, setResult] = useState<AnalysisRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const analyticsParams = new URLSearchParams(Object.entries(filters).filter(([, value]) => value))
  const analyticsUrl = `${apiRoutes.statistics.analytics}${analyticsParams.size ? `?${analyticsParams}` : ''}`

  const refresh = async () => {
    const [summary, records] = await Promise.all([
      apiRequest<AnalyticsReport>(analyticsUrl),
      apiRequest<AnalysisRecord[]>(apiRoutes.statistics.history),
    ])
    setReport(summary)
    setHistory(records)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      apiRequest<AnalyticsReport>(analyticsUrl),
      apiRequest<AnalysisRecord[]>(apiRoutes.statistics.history),
    ]).then(([summary, records]) => {
      if (!active) return
      setReport(summary)
      setHistory(records)
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron consultar los datos analíticos.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [analyticsUrl])

  const submitValues = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const observations = values.split(/[\s,;]+/).filter(Boolean).map(Number)
    if (!observations.length || observations.some((value) => !Number.isFinite(value))) {
      setError('Ingresa observaciones numéricas separadas por coma o espacio.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const selectedMode = modes.find((item) => item.id === mode)!
      const record = await apiRequest<AnalysisRecord>(selectedMode.endpoint, {
        method: 'POST',
        body: JSON.stringify(mode === 'random_variable'
          ? { values: observations, name: variable.name.trim(), variable_type: variable.variable_type }
          : { values: observations }),
      })
      setResult(record)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo calcular el análisis.')
    } finally {
      setSaving(false)
    }
  }

  const submitBayes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const record = await apiRequest<AnalysisRecord>(apiRoutes.statistics.bayes, {
        method: 'POST',
        body: JSON.stringify({
          probability_a: Number(bayesValues.prior),
          probability_b_given_a: Number(bayesValues.likelihood),
          probability_b_given_not_a: Number(bayesValues.falsePositive),
        }),
      })
      setResult(record)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo calcular Bayes.')
    } finally {
      setSaving(false)
    }
  }

  const maxMonthlySale = Math.max(...report.sales_by_month.map((sale) => sale.total), 1)
  const saleInsight = report.insights[0]
  const formatResult = (key: string, value: number | string) => key.includes('probability') || key === 'probability_b'
    ? `${(Number(value) * 100).toLocaleString('es-PE', { maximumFractionDigits: 2 })}%`
    : typeof value === 'number' ? value.toLocaleString('es-PE', { maximumFractionDigits: 2 }) : value

  return <section className="analytics-page">
    <header className="analytics-heading">
      <div><span className="analytics-eyebrow">SALESIA ENTERPRISE / DATOS COMERCIALES</span><h1>Analytics</h1><p>Estadística aplicada a las ventas registradas en la plataforma.</p></div>
      <span className="analytics-source">{loading ? 'Actualizando datos' : `${report.sales_count} ventas completadas`}</span>
    </header>
    {error && <p className="analytics-error" role="alert">{error}</p>}

    <section className="analytics-kpis" aria-label="Indicadores estadísticos de ventas">
      <article><span>Ingresos completados</span><strong>{loading ? '…' : currency.format(report.total_revenue)}</strong><small>Ventas no canceladas</small></article>
      <article><span>Media de venta</span><strong>{loading ? '…' : currency.format(report.average_sale)}</strong><small>Promedio aritmético</small></article>
      <article><span>Mediana de venta</span><strong>{loading ? '…' : currency.format(report.median_sale)}</strong><small>Valor central ordenado</small></article>
      <article><span>Unidades por venta</span><strong>{loading ? '…' : report.average_quantity.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</strong><small>Media de cantidades</small></article>
    </section>

    <section className="analytics-filters" aria-label="Filtros de Analytics">
      <label>Desde<input type="date" value={filters.date_from} onChange={(event) => setFilters({ ...filters, date_from: event.target.value })} /></label>
      <label>Hasta<input type="date" value={filters.date_to} onChange={(event) => setFilters({ ...filters, date_to: event.target.value })} /></label>
      <label>Sucursal<select value={filters.branch} onChange={(event) => setFilters({ ...filters, branch: event.target.value })}><option value="">Todas</option>{report.filter_options.branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
      <label>Vendedor<select value={filters.seller} onChange={(event) => setFilters({ ...filters, seller: event.target.value })}><option value="">Todos</option>{report.filter_options.sellers.map((seller) => <option key={seller} value={seller}>{seller}</option>)}</select></label>
      <label>Categoría<select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">Todas</option>{report.filter_options.categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
    </section>

    <section className="analytics-insight"><div><span className="analytics-eyebrow">INSIGHT EXPLICABLE · {saleInsight?.rule_code ?? 'SIN DATOS'}</span><h2>{saleInsight?.title ?? 'Sin observaciones comerciales'}</h2><p>{saleInsight?.description ?? 'Registra ventas completadas para generar una lectura estadística.'}</p></div><div className="analytics-insight-evidence"><span>VENTAS</span><strong>{saleInsight?.evidence.sales_count ?? 0}</strong><span>MEDIA</span><strong>{currency.format(saleInsight?.evidence.mean ?? 0)}</strong><span>MEDIANA</span><strong>{currency.format(saleInsight?.evidence.median ?? 0)}</strong></div></section>

    <section className="analytics-overview">
      <article className="analytics-panel analytics-chart-panel">
        <div className="analytics-panel-heading"><div><span className="analytics-eyebrow">TENDENCIA</span><h2>Ingresos por mes</h2></div><span className="analytics-legend"><i /> PEN</span></div>
        {report.sales_by_month.length ? <div className="analytics-chart" role="img" aria-label="Ingresos mensuales de ventas completadas">
          {report.sales_by_month.map((sale) => <div className="analytics-bar-column" key={sale.month} title={`${sale.month}: ${currency.format(sale.total)}`}>
            <span>{currency.format(sale.total)}</span><i style={{ height: `${Math.max(4, sale.total / maxMonthlySale * 100)}%` }} /><small>{new Intl.DateTimeFormat('es', { month: 'short' }).format(new Date(`${sale.month}-01T00:00:00`))}</small>
          </div>)}
        </div> : <p className="analytics-empty">Las ventas completadas aparecerán aquí.</p>}
      </article>
      <article className="analytics-panel analytics-products-panel">
        <div className="analytics-panel-heading"><div><span className="analytics-eyebrow">CONTRIBUCIÓN</span><h2>Productos vendidos</h2></div></div>
        {report.sales_by_product.length ? <div className="analytics-product-list">{report.sales_by_product.slice(0, 6).map((product, index) => <div key={product.product}>
          <span className="analytics-product-rank">{String(index + 1).padStart(2, '0')}</span><div><strong>{product.product}</strong><small>{product.quantity.toLocaleString('es-PE')} unidades</small></div><b>{currency.format(product.revenue)}</b>
        </div>)}</div> : <p className="analytics-empty">Todavía no hay productos asociados a ventas.</p>}
      </article>
    </section>

    <section className="analytics-analysis-grid">
      <article className="analytics-panel">
        <div className="analytics-panel-heading"><div><span className="analytics-eyebrow">DESCRIPTIVA</span><h2>Analizar observaciones</h2></div></div>
        <div className="analytics-segmented" role="group" aria-label="Tipo de cálculo">
          {modes.map((item) => <button key={item.id} type="button" className={mode === item.id ? 'selected' : ''} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>{item.label}</button>)}
        </div>
        <form className="analytics-form" onSubmit={(event) => void submitValues(event)}>
          {mode === 'random_variable' && <div className="analytics-variable-fields"><label>Variable<input value={variable.name} onChange={(event) => setVariable({ ...variable, name: event.target.value })} required /></label><label>Naturaleza<select value={variable.variable_type} onChange={(event) => setVariable({ ...variable, variable_type: event.target.value as 'discreta' | 'continua' })}><option value="discreta">Discreta</option><option value="continua">Continua</option></select></label></div>}
          <label>Valores numéricos<textarea value={values} onChange={(event) => setValues(event.target.value)} placeholder="120, 180, 240, 390" rows={3} required /></label>
          <button className="analytics-submit" type="submit" disabled={saving}>{saving ? 'Calculando…' : 'Calcular y guardar'}</button>
        </form>
      </article>

      <article className="analytics-panel">
        <div className="analytics-panel-heading"><div><span className="analytics-eyebrow">PROBABILIDAD</span><h2>Teorema de Bayes</h2></div></div>
        <form className="analytics-form analytics-bayes-form" onSubmit={(event) => void submitBayes(event)}>
          <label>Probabilidad previa P(A)<input type="number" min="0" max="1" step="0.01" value={bayesValues.prior} onChange={(event) => setBayesValues({ ...bayesValues, prior: event.target.value })} required /></label>
          <label>Verosimilitud P(B|A)<input type="number" min="0" max="1" step="0.01" value={bayesValues.likelihood} onChange={(event) => setBayesValues({ ...bayesValues, likelihood: event.target.value })} required /></label>
          <label>Falso positivo P(B|¬A)<input type="number" min="0" max="1" step="0.01" value={bayesValues.falsePositive} onChange={(event) => setBayesValues({ ...bayesValues, falsePositive: event.target.value })} required /></label>
          <button className="analytics-submit" type="submit" disabled={saving}>{saving ? 'Calculando…' : 'Calcular probabilidad'}</button>
        </form>
      </article>
    </section>

    {result && <section className="analytics-result" aria-live="polite"><div><span className="analytics-eyebrow">RESULTADO GUARDADO</span><h2>{result.operation === 'bayes' ? 'Probabilidad posterior' : 'Resumen del cálculo'}</h2></div><div className="analytics-result-values">{Object.entries(result.result).map(([key, value]) => <div key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{formatResult(key, value)}</strong></div>)}</div></section>}

    <section className="analytics-history">
      <div className="analytics-history-heading"><div><span className="analytics-eyebrow">TRAZABILIDAD</span><h2>Historial de análisis</h2></div><span>{history.length} registros</span></div>
      <div className="analytics-table-wrap"><table><thead><tr><th>Análisis</th><th>Observaciones</th><th>Resultado</th><th>Fecha</th></tr></thead><tbody>
        {history.map((record) => <tr key={record.id}><td>{({ mean: 'Media', median: 'Mediana', compare: 'Media vs. mediana', bayes: 'Teorema de Bayes', random_variable: 'Variable aleatoria' } as Record<string, string>)[record.operation] ?? record.operation}</td><td>{Array.isArray(record.inputs.values) ? record.inputs.values.join(', ') : 'Probabilidades ingresadas'}</td><td>{Object.entries(record.result).map(([key, value]) => `${key}: ${formatResult(key, value)}`).join(' · ')}</td><td>{new Date(record.created_at).toLocaleString('es-PE')}</td></tr>)}
      </tbody></table>{!loading && history.length === 0 && <p className="analytics-empty">Los cálculos guardados aparecerán aquí.</p>}</div>
    </section>
  </section>
}
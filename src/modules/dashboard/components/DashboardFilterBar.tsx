export interface DashboardFilters {
  date_from: string
  date_to: string
  branch: string
  seller: string
  category: string
}

export interface DashboardFilterOptions {
  branches: string[]
  sellers: string[]
  categories: string[]
}

export function DashboardFilterBar({
  filters,
  options,
  onChange,
  onReset,
  disabled = false,
}: {
  filters: DashboardFilters
  options: DashboardFilterOptions
  onChange: (key: keyof DashboardFilters, value: string) => void
  onReset: () => void
  disabled?: boolean
}) {
  return <section className={`dashboard-filters ${disabled ? 'demo-disabled' : ''}`} aria-label="Filtros de ventas y analítica">
    <label>Desde<input type="date" value={filters.date_from} onChange={(event) => onChange('date_from', event.target.value)} disabled={disabled} /></label>
    <label>Hasta<input type="date" value={filters.date_to} onChange={(event) => onChange('date_to', event.target.value)} disabled={disabled} /></label>
    <label>Sucursal<select value={filters.branch} onChange={(event) => onChange('branch', event.target.value)} disabled={disabled}><option value="">Todas</option>{options.branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
    <label>Vendedor<select value={filters.seller} onChange={(event) => onChange('seller', event.target.value)} disabled={disabled}><option value="">Todos</option>{options.sellers.map((seller) => <option key={seller} value={seller}>{seller}</option>)}</select></label>
    <label>Categoría<select value={filters.category} onChange={(event) => onChange('category', event.target.value)} disabled={disabled}><option value="">Todas</option>{options.categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
    <button type="button" onClick={onReset} disabled={disabled}>Limpiar filtros</button>
    {disabled && <p className="dashboard-filter-demo-note">Los filtros son una muestra visual; los datos del demo son estáticos.</p>}
  </section>
}
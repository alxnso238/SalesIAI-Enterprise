import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/useAuth'
import { apiRequest, apiRoutes } from '../services/api'
import './module-page.css'
import './users-page.css'

type Role = 'admin' | 'analyst' | 'viewer' | 'member'
type UserRow = { id: number; name: string; email: string; role: Role; status: 'active' | 'inactive' }
type Draft = { name: string; email: string; password: string; role: Role }
const roles: { value: Role; label: string }[] = [{ value: 'admin', label: 'Administrador' }, { value: 'analyst', label: 'Analista' }, { value: 'viewer', label: 'Consulta' }, { value: 'member', label: 'Miembro' }]

export function UsersPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [rows, setRows] = useState<UserRow[]>([])
  const [changes, setChanges] = useState<Record<number, Partial<UserRow> & { is_active?: boolean; password?: string }>>({})
  const [draft, setDraft] = useState<Draft>({ name: '', email: '', password: '', role: 'viewer' })
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const reload = async () => { setLoading(true); try { setRows(await apiRequest<UserRow[]>(apiRoutes.users)); setError('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar usuarios.') } finally { setLoading(false) } }
  useEffect(() => {
    let active = true
    void apiRequest<UserRow[]>(apiRoutes.users).then(users => {
      if (active) { setRows(users); setError('') }
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar usuarios.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])
  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError('')
    try { await apiRequest(apiRoutes.users, { method: 'POST', body: JSON.stringify({ full_name: draft.name, email: draft.email, password: draft.password, role: draft.role }) }); setDraft({ name: '', email: '', password: '', role: 'viewer' }); setCreating(false); setNotice('Usuario creado. La contraseña se guarda como hash seguro.'); await reload() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo crear el usuario.') } finally { setSaving(false) }
  }
  const saveUser = async (record: UserRow) => {
    const payload: Record<string, string | number | boolean> = Object.fromEntries(Object.entries(changes[record.id] ?? {}).filter(([key, value]) => key !== 'status' && value !== undefined && value !== ''))
    if (typeof payload.name === 'string') {
      payload.full_name = payload.name
      delete payload.name
    }
    if (!Object.keys(payload).length) return
    setSaving(true); setError('')
    try { await apiRequest(`${apiRoutes.users}/${record.id}`, { method: 'PATCH', body: JSON.stringify(payload) }); setChanges(state => { const next = { ...state }; delete next[record.id]; return next }); setNotice(`Cambios guardados para ${record.name}.`); await reload() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el usuario.') } finally { setSaving(false) }
  }
  const filtered = rows.filter(row => `${row.name} ${row.email} ${row.role} ${row.status}`.toLowerCase().includes(query.toLowerCase()))
  return <section className="module-page users-page">
    <div className="module-heading"><div><div className="breadcrumb-line"><span>Inicio</span><span>/</span><b>Usuarios</b></div><h1>Usuarios y acceso</h1><p>Identidades, roles y estado de acceso al espacio de trabajo.</p></div>{isAdmin && <button className="module-primary" onClick={() => setCreating(open => !open)}>{creating ? 'Cancelar' : '+ Nuevo usuario'}</button>}</div>
    <div className="users-summary"><strong>{rows.length}</strong><span>cuentas registradas</span><span className="users-role-legend">Administrador · Analista · Consulta · Miembro</span></div>
    {error && <p className="module-error" role="alert">{error}</p>}{notice && <p className="users-notice" role="status">{notice}</p>}
    {creating && isAdmin && <form className="module-form-card users-create-form" onSubmit={createUser}><div className="module-form-heading"><div><span className="eyebrow">ALTA DE ACCESO</span><h2>Crear usuario</h2></div></div><div className="module-form-grid">
      <label>Nombre completo<input required minLength={2} maxLength={150} autoComplete="name" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Correo<input required type="email" maxLength={150} autoComplete="email" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} /></label>
      <label>Contraseña inicial<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={draft.password} onChange={event => setDraft({ ...draft, password: event.target.value })} /></label>
      <label>Rol<select value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value as Role })}>{roles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
    </div><div className="module-form-actions"><button className="module-primary" disabled={saving}>{saving ? 'Guardando…' : 'Crear usuario'}</button></div></form>}
    <div className="module-toolbar"><div className="module-count"><strong>{filtered.length}</strong> de {rows.length} usuarios</div><div className="module-actions"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar nombre, correo o rol…" aria-label="Buscar usuarios" /></div></div>
    <div className="module-card"><div className="module-table-wrap"><table className="module-table"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th>{isAdmin && <th>Administración</th>}</tr></thead><tbody>{filtered.map(record => {
      const draftRow = changes[record.id] ?? {}; const dirty = Boolean(changes[record.id])
      return <tr key={record.id}><td>{isAdmin ? <input aria-label={`Nombre de ${record.name}`} value={draftRow.name ?? record.name} onChange={event => setChanges({ ...changes, [record.id]: { ...draftRow, name: event.target.value } })} /> : record.name}</td><td>{isAdmin ? <input aria-label={`Correo de ${record.name}`} type="email" value={draftRow.email ?? record.email} onChange={event => setChanges({ ...changes, [record.id]: { ...draftRow, email: event.target.value } })} /> : record.email}</td><td>{isAdmin ? <select aria-label={`Rol de ${record.name}`} value={draftRow.role ?? record.role} onChange={event => setChanges({ ...changes, [record.id]: { ...draftRow, role: event.target.value as Role } })}>{roles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}</select> : roles.find(role => role.value === record.role)?.label ?? record.role}</td><td>{isAdmin ? <select aria-label={`Estado de ${record.name}`} value={draftRow.status ?? record.status} onChange={event => setChanges({ ...changes, [record.id]: { ...draftRow, status: event.target.value as UserRow['status'], is_active: event.target.value === 'active' } })}><option value="active">Activo</option><option value="inactive">Inactivo</option></select> : record.status === 'active' ? 'Activo' : 'Inactivo'}</td>{isAdmin && <td className="user-admin-actions"><input aria-label={`Contraseña nueva para ${record.name}`} type="password" minLength={12} maxLength={128} placeholder="Restablecer contraseña" value={draftRow.password ?? ''} onChange={event => setChanges({ ...changes, [record.id]: { ...draftRow, password: event.target.value } })} /><button className="module-primary" disabled={saving || !dirty} onClick={() => void saveUser(record)}>Guardar</button></td>}</tr>
    })}</tbody></table>{loading && <div className="module-empty">Consultando usuarios…</div>}{!loading && !filtered.length && <div className="module-empty">No hay usuarios que coincidan con la búsqueda.</div>}</div><div className="module-card-footer">Las contraseñas nunca se muestran; solo se almacenan hashes PBKDF2.</div></div>
  </section>
}

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { apiRequest, apiRoutes } from '../services/api';
import './login.css';

type AuthResponse = {
  access_token: string;
  user: { email: string; name: string; role: string };
};
type AuthMode = 'login' | 'register';

export const LoginPage = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const registering = mode === 'register';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (registering && password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const result = await apiRequest<AuthResponse>(
        registering ? apiRoutes.auth.register : apiRoutes.auth.login,
        {
          method: 'POST',
          body: JSON.stringify(registering
            ? { full_name: fullName, email, password }
            : { email, password }),
        },
      );
      login(result.user.email, result.access_token, result.user.role, result.user.name);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible completar el acceso.');
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
  };

  return <div className="login-container">
    <div className="login-card">
      <button
        type="button"
        className="login-close"
        onClick={() => navigate('/')}
        aria-label="Cerrar y volver al inicio"
        title="Volver al inicio"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m18 6-12 12M6 6l12 12" />
        </svg>
      </button>
      <div className="login-header">
        <div className="login-brand"><span className="login-brand-mark">S</span><span>SalesIA <b>Enterprise</b></span></div>
        <p className="login-subtitle">{registering ? 'Crea tu cuenta de usuario' : 'Accede a tu espacio de trabajo'}</p>
      </div>
      <div className="login-tabs" role="tablist" aria-label="Acceso a la cuenta">
        <button type="button" role="tab" aria-selected={!registering} className={`login-tab-btn ${!registering ? 'active' : ''}`} onClick={() => changeMode('login')}>Iniciar sesión</button>
        <button type="button" role="tab" aria-selected={registering} className={`login-tab-btn ${registering ? 'active' : ''}`} onClick={() => changeMode('register')}>Registrarse</button>
      </div>
      {error && <div className="login-error" role="alert">{error}</div>}
      <form onSubmit={handleSubmit}>
        {registering && <div className="login-form-group">
          <label className="login-label" htmlFor="full-name">Nombre completo</label>
          <div className="login-input-wrapper">
            <span className="input-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg></span>
            <input id="full-name" type="text" autoComplete="name" minLength={2} maxLength={150} required value={fullName} onChange={(event) => setFullName(event.target.value)} className="login-input" />
          </div>
        </div>}
        <div className="login-form-group">
          <label className="login-label" htmlFor="email">Correo electrónico</label>
          <div className="login-input-wrapper">
            <span className="input-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></span>
            <input id="email" type="email" autoComplete="email" maxLength={150} required value={email} onChange={(event) => setEmail(event.target.value)} className="login-input" />
          </div>
        </div>
        <div className="login-form-group">
          <label className="login-label" htmlFor="password">Contraseña</label>
          <div className="login-input-wrapper">
            <span className="input-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 12 : 1} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} className="login-input" />
            <button type="button" className="login-password-toggle" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
          </div>
        </div>
        {registering && <div className="login-form-group">
          <label className="login-label" htmlFor="password-confirmation">Confirmar contraseña</label>
          <div className="login-input-wrapper">
            <span className="input-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
            <input id="password-confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={128} required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} className="login-input" />
          </div>
        </div>}
        <button type="submit" disabled={loading} className="login-button">
          {loading ? 'Procesando...' : registering ? 'Crear cuenta' : 'Ingresar al sistema'}
        </button>
      </form>
    </div>
  </div>;
};

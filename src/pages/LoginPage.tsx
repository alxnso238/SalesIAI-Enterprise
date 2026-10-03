import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './login.css';

export const LoginPage = ({ onClose }: { onClose?: () => void }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!onClose) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return <div
    className={`login-container ${onClose ? 'login-modal-container' : ''}`}
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}
  >
    <div className={`login-card ${onClose ? 'login-modal-card' : ''}`} role={onClose ? 'dialog' : undefined} aria-modal={onClose ? true : undefined} aria-labelledby={onClose ? 'login-dialog-title' : undefined} aria-describedby={onClose ? 'login-dialog-description' : undefined}>
      {onClose && <button className="login-modal-close" type="button" onClick={onClose} aria-label="Cerrar inicio de sesión" title="Cerrar">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg>
      </button>}
      <div className="login-header">
        <div className="login-brand"><span className="login-brand-mark">S</span><span>SalesIA <b>Enterprise</b></span></div>
        <span className="login-demo-label">RECORRIDO INTERACTIVO</span>
        <h1 className="login-title" id={onClose ? 'login-dialog-title' : undefined}>Explora SalesIA Enterprise</h1>
        <p className="login-subtitle">Accede al dashboard y recorre los módulos con datos de demostración. No necesitas cuenta ni conexión al backend.</p>
      </div>
      <button type="button" className="login-button login-demo-enter" onClick={() => navigate('/dashboard')}>
        Entrar al dashboard <span aria-hidden="true">→</span>
      </button>
      <p className="login-security-note" id={onClose ? 'login-dialog-description' : undefined}><span aria-hidden="true">●</span> Datos ficticios · sin conexión a servicios</p>
    </div>
  </div>;
};

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import './home.css';

interface FeatureItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  details: string;
}

export const HomePage: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const features: FeatureItem[] = [
    {
      id: 'dashboard',
      title: 'Dashboard ejecutivo',
      subtitle: 'Monitoreo en tiempo real',
      description: 'Panel de control con métricas financieras, inventarios valorizados y KPIs corporativos.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
      details: 'El Dashboard Ejecutivo centraliza ventas, ingresos por sucursal, inventario y el rendimiento comercial mediante indicadores actualizados desde la operación.'
    },
    {
      id: 'math',
      title: 'Analítica estadística',
      subtitle: 'Estadística aplicada a las ventas',
      description: 'Media, mediana, variables aleatorias, probabilidades e insights comerciales.',
      image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80',
      details: 'El módulo Analytics convierte las ventas registradas en indicadores, comparaciones de media y mediana, cálculos de Bayes y observaciones comerciales explicables.'
    },
    {
      id: 'sales',
      title: 'Ventas y pedidos',
      subtitle: 'Del registro al seguimiento',
      description: 'Administra operaciones comerciales, detalle de productos, pagos y seguimiento de cada venta.',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
      details: 'El flujo de ventas relaciona clientes, productos, sucursales y vendedores para conservar trazabilidad desde el pedido hasta el pago.'
    },
    {
      id: 'customers',
      title: 'Clientes y catálogo',
      subtitle: 'Información comercial centralizada',
      description: 'Consulta perfiles de clientes y mantén productos, categorías y precios en un catálogo único.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
      details: 'Las fichas de clientes y el catálogo de productos respaldan el registro de ventas y ayudan a entender el comportamiento comercial.'
    },
    {
      id: 'management',
      title: 'Inventario y sucursales',
      subtitle: 'Existencias con trazabilidad',
      description: 'Controla stock y movimientos por producto, con una estructura preparada para varias sucursales.',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
      details: 'El módulo de inventario registra entradas y salidas, facilita la consulta de existencias y relaciona la operación con sus sucursales.'
    }
  ];

  return (
    <div className="home-container">
      {/* Barra de navegación */}
      <header className="home-nav">
        <Link to="/" className="home-brand">
          <span className="home-brand-mark">S</span>
          <span>SalesIA <b>Enterprise</b></span>
        </Link>
        <nav className="home-nav-links" aria-label="Secciones de la portada">
          <a href="#modulos">Módulos</a>
          <a href="#flujo">Flujo</a>
          <a href="#analitica">Analítica</a>
          <a href="#seguridad">Seguridad</a>
        </nav>
        <div className="home-nav-actions">
          <button type="button" className="home-btn-primary" onClick={() => setLoginOpen(true)} aria-haspopup="dialog" aria-expanded={loginOpen}>Iniciar sesión</button>
        </div>
      </header>

      <main className="home-hero">
        <span className="home-badge">Ventas · inventario · analítica</span>
        <h1 className="home-title">
          SalesIA <span>Enterprise</span>
        </h1>
        <p className="home-description">
          Gestión comercial conectada con analítica estadística para convertir las operaciones diarias en información útil para el negocio.
        </p>
        <div className="home-hero-domains" aria-label="Áreas integradas">
          <span>Ventas</span>
          <span>Clientes y productos</span>
          <span>Inventario</span>
          <span>Analytics</span>
        </div>
      </main>

      <section className="home-showcase-section" id="modulos">
        <div className="home-section-heading">
          <span className="home-section-kicker">PLATAFORMA INTEGRADA</span>
          <h2 className="home-section-title">Operación y análisis, en un solo lugar</h2>
          <p className="home-section-subtitle">Desde el control diario de ventas y existencias hasta la lectura estadística del negocio.</p>
        </div>
        
        <div className="home-cards-grid">
          {features.map((item) => (
            <div key={item.id} className="home-showcase-card">
              <div className="home-card-image-container">
                <img src={item.image} alt={item.title} />
              </div>
              <div className="home-card-content">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <button 
                  className="home-read-more-btn" 
                  onClick={() => setSelectedFeature(item)}
                >
                  Leer más ➔
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-process-section" id="flujo">
        <div className="home-process-heading">
          <span className="home-section-kicker">FLUJO COMERCIAL</span>
          <h2 className="home-section-title">Cada operación aporta contexto</h2>
          <p className="home-section-subtitle">SalesIA conecta el trabajo diario con los indicadores que ayudan a entender el negocio.</p>
        </div>
        <ol className="home-process-steps">
          <li><span>01</span><div><h3>Gestiona clientes</h3><p>Centraliza contactos y su historial comercial.</p></div></li>
          <li><span>02</span><div><h3>Registra ventas</h3><p>Relaciona productos, vendedor, sucursal y pago.</p></div></li>
          <li><span>03</span><div><h3>Actualiza inventario</h3><p>Mantén trazabilidad de existencias y movimientos.</p></div></li>
          <li><span>04</span><div><h3>Analiza resultados</h3><p>Consulta tendencias, estadísticas e insights.</p></div></li>
        </ol>
      </section>

      <section className="home-analytics-section" id="analitica">
        <div className="home-analytics-copy">
          <span className="home-section-kicker">ANALÍTICA COMERCIAL</span>
          <h2 className="home-section-title">De los registros a los indicadores</h2>
          <p className="home-section-subtitle">Analiza los datos que genera la operación diaria para entender tendencias y respaldar decisiones comerciales.</p>
        </div>
        <div className="home-analytics-grid">
          <article>
            <span>01</span>
            <h3>Medidas descriptivas</h3>
            <p>Consulta media, mediana, ticket promedio y cantidad de ventas.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Distribución comercial</h3>
            <p>Explora resultados por período, producto, sucursal y vendedor.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Probabilidad e insights</h3>
            <p>Aplica análisis de probabilidad y revisa conclusiones con evidencia numérica.</p>
          </article>
        </div>
      </section>

      <section className="home-tech-section" id="seguridad">
        <div className="home-tech-container">
          <span className="home-section-kicker">CONTROL EMPRESARIAL</span>
          <h2 className="home-section-title">De cada operación a una mejor decisión</h2>
          <p className="home-section-subtitle">Datos centralizados, métricas trazables y acceso según las responsabilidades del equipo.</p>
          
          <div className="home-tech-grid">
            <div className="home-tech-card">
              <h4>Operación conectada</h4>
              <p>Ventas, clientes, productos e inventario comparten la misma base comercial.</p>
            </div>
            <div className="home-tech-card">
              <h4>Analítica explicable</h4>
              <p>Media, mediana e indicadores contextualizados a las ventas registradas.</p>
            </div>
            <div className="home-tech-card">
              <h4>Acceso por roles</h4>
              <p>Vistas y acciones disponibles según los permisos asignados a cada usuario.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Modal interactivo al hacer clic en "Leer más" */}
      {selectedFeature && (
        <div className="home-modal-overlay" onClick={() => setSelectedFeature(null)}>
          <div className="home-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedFeature.image} alt={selectedFeature.title} className="home-modal-img" />
            <div className="home-modal-body">
              <h2>{selectedFeature.title}</h2>
              <p className="home-modal-subtitle">{selectedFeature.subtitle}</p>
              <p>{selectedFeature.details}</p>
              <button className="home-modal-close" onClick={() => setSelectedFeature(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pie de página */}
      <footer className="home-footer">
        © 2026 SalesIA Enterprise · Gestión comercial y Analytics.
      </footer>
      {loginOpen && <LoginPage onClose={() => setLoginOpen(false)} />}
    </div>
  );
};
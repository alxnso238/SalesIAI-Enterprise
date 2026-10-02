import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

  const features: FeatureItem[] = [
    {
      id: 'dashboard',
      title: 'DASHBOARD EJECUTIVO',
      subtitle: 'Monitoreo en tiempo real',
      description: 'Panel de control con métricas financieras, inventarios valorizados y KPIs corporativos.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
      details: 'El Dashboard Ejecutivo centraliza la información clave de MatrixFlow Enterprise. Permite visualizar el flujo de operaciones, ingresos por sucursal y el rendimiento general de los procesos mediante gráficos interactivos actualizados al instante.'
    },
    {
      id: 'math',
      title: 'ANÁLISIS MATEMÁTICO',
      subtitle: 'Herramientas de cálculo vectorial',
      description: 'Módulo especializado para operaciones matriciales, determinantes y combinaciones lineales.',
      image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80',
      details: 'Diseñado para la optimización de procesos logísticos y de inventario. Permite ejecutar operaciones avanzadas con matrices, resolución de sistemas de ecuaciones lineales y proyecciones basadas en modelos matemáticos.'
    },
    {
      id: 'management',
      title: 'GESTIÓN EMPRESARIAL',
      subtitle: 'Control total de productos y sucursales',
      description: 'Administración ágil de inventarios, catálogos y perfiles con total seguridad de datos.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
      details: 'Estructura modular orientada al control multi-sucursal. Facilita la asignación de roles, el registro de entradas y salidas de almacén y la auditoría detallada de cada movimiento dentro de la organización.'
    }
  ];

  return (
    <div className="home-container">
      {/* Barra de navegación */}
      <header className="home-nav">
        <Link to="/" className="home-brand">
          <span className="home-brand-mark">M</span>
          <span>MatrixFlow <b>Enterprise</b></span>
        </Link>
        <div className="home-nav-actions">
          <Link to="/login" className="home-btn-outline">Iniciar Sesión</Link>
          <Link to="/login" className="home-btn-primary">Registrarse</Link>
        </div>
      </header>

      {/* Contenido Principal / Hero */}
      <main className="home-hero">
        <span className="home-badge">Plataforma Empresarial Fase 1</span>
        <h1 className="home-title">
          Control y Análisis Avanzado para <span>MatrixFlow Enterprise</span>
        </h1>
        <p className="home-description">
          Sistema integral optimizado para la gestión gerencial, inventarios dinámicos, análisis matemático empresarial y control ejecutivo en tiempo real.
        </p>
        <Link to="/login" className="home-cta-primary">Acceder al Sistema</Link>
      </main>

      {/* Sección estilo Logitech: Descubrir la Serie / Módulos */}
      <section className="home-showcase-section">
        <h2 className="home-section-title">Descubrir la Serie</h2>
        <p className="home-section-subtitle">Explora los componentes clave que conforman nuestra arquitectura tecnológica.</p>
        
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

      {/* Sección de Librerías y Tecnologías */}
      <section className="home-tech-section">
        <div className="home-tech-container">
          <h2 className="home-section-title">Stack Tecnológico y Librerías</h2>
          <p className="home-section-subtitle">Tecnologías de alto rendimiento utilizadas en el desarrollo del proyecto.</p>
          
          <div className="home-tech-grid">
            <div className="home-tech-card">
              <h4>React & TypeScript</h4>
              <p>Interfaz de usuario modular, tipado estricto y componentes altamente reutilizables.</p>
            </div>
            <div className="home-tech-card">
              <h4>React Router DOM</h4>
              <p>Enrutamiento dinámico de cliente y protección de vistas privadas por sesión.</p>
            </div>
            <div className="home-tech-card">
              <h4>Vite</h4>
              <p>Entorno de empaquetado ultra rápido con recarga instantánea en caliente (HMR).</p>
            </div>
            <div className="home-tech-card">
              <h4>CSS Moderno & Flexbox</h4>
              <p>Diseño responsivo adaptado con efectos visuales inmersivos y animaciones fluidas.</p>
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
              <p style={{ color: '#38bdf8', fontWeight: 600, marginBottom: '0.75rem' }}>{selectedFeature.subtitle}</p>
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
        © 2026 MatrixFlow Enterprise · Plan maestro · Fase 1 · Todos los derechos reservados.
      </footer>
    </div>
  );
};
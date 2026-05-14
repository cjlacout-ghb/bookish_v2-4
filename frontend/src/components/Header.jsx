import { Link, useLocation } from 'react-router-dom'
import { useState, memo, useEffect } from 'react'

function Header() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Cerrar el menú si cambia la ruta
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <header className="landing-header">
      <Link 
        to="/" 
        className="landing-logo-link"
        onClick={() => {
          if (location.pathname === '/') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
      >
        <div className="landing-logo">
          BOOKISH
          <span className="landing-version">v2.4</span>
        </div>
      </Link>
      
      <nav className="landing-nav hidden-mobile">
        <Link 
          to="/biblioteca" 
          className={`nav-link ${location.pathname === '/biblioteca' ? 'active' : ''}`}
        >
          LA BIBLIOTECA
        </Link>
        <Link 
          to="/agregar" 
          className={`nav-link ${location.pathname === '/agregar' ? 'active' : ''}`}
        >
          AGREGAR LIBRO
        </Link>
        <Link 
          to="/sesiones" 
          className={`nav-link ${location.pathname === '/sesiones' ? 'active' : ''}`}
        >
          SESIONES
        </Link>
        <Link 
          to="/reportes" 
          className={`nav-link ${location.pathname === '/reportes' ? 'active' : ''}`}
        >
          REPORTES
        </Link>
        <Link 
          to="/inteligencia-visual" 
          className={`nav-link ${location.pathname === '/inteligencia-visual' ? 'active' : ''}`}
        >
          INTELIGENCIA VISUAL
        </Link>
        <Link 
          to="/mapa-de-mundos" 
          className={`nav-link ${location.pathname === '/mapa-de-mundos' ? 'active' : ''}`}
        >
          EL MAPA DE MUNDOS
        </Link>

      </nav>

      <div className="landing-actions">
        <Link to="/backup" title="Importar / Exportar Biblioteca" style={{ color: 'inherit', textDecoration: 'none', marginRight: '1rem' }} className="hidden-mobile">
          <span className="material-symbols-outlined nav-icon" data-icon="cloud">
            cloud
          </span>
        </Link>
        <Link to="/guia" title="Guía de Usuario" style={{ color: 'inherit', textDecoration: 'none', marginRight: '0.5rem' }} className="hidden-mobile">
          <span className="material-symbols-outlined nav-icon" data-icon="menu_book">
            menu_book
          </span>
        </Link>
        
        {/* Botón Hamburguesa solo visible en móvil */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Menú"
        >
          <span className="material-symbols-outlined nav-icon">
            {isMobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Menú Overlay Móvil */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-overlay">
          <nav className="mobile-nav-content">
            <div className="mobile-nav-header">
              <span className="landing-logo">BOOKISH</span>
            </div>
            
            <Link to="/biblioteca" className={`mobile-nav-link ${location.pathname === '/biblioteca' ? 'active' : ''}`}>
              LA BIBLIOTECA
            </Link>
            <Link to="/agregar" className={`mobile-nav-link ${location.pathname === '/agregar' ? 'active' : ''}`}>
              AGREGAR LIBRO
            </Link>
            <Link to="/sesiones" className={`mobile-nav-link ${location.pathname === '/sesiones' ? 'active' : ''}`}>
              SESIONES
            </Link>
            <Link to="/reportes" className={`mobile-nav-link ${location.pathname === '/reportes' ? 'active' : ''}`}>
              REPORTES
            </Link>
            <Link to="/inteligencia-visual" className={`mobile-nav-link ${location.pathname === '/inteligencia-visual' ? 'active' : ''}`}>
              INTELIGENCIA VISUAL
            </Link>
            <Link to="/mapa-de-mundos" className={`mobile-nav-link ${location.pathname === '/mapa-de-mundos' ? 'active' : ''}`}>
              EL MAPA DE MUNDOS
            </Link>
            
            <div className="mobile-nav-separator"></div>
            
            <div className="mobile-nav-footer-links">
              <Link to="/backup" className="mobile-nav-link-small">
                <span className="material-symbols-outlined">cloud</span> Backup
              </Link>
              <Link to="/guia" className="mobile-nav-link-small">
                <span className="material-symbols-outlined">menu_book</span> Guía
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export default memo(Header)

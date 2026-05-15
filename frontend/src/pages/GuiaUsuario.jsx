import Header from '../components/Header.jsx'

export default function GuiaUsuario() {
  return (
    <>
      <Header />
      <main className="pagina guia-usuario">
        <div className="reportes-page animar-entrada">
          <div className="timers-page__header">
            <h1 className="timers-page__titulo">GUÍA DE USUARIO</h1>
            <p className="timers-page__subtitulo">Tu archivo personal de lectura y exploración.</p>
          </div>

          <section className="guia-cuerpo">
            <div className="seccion-bloque">
              <h2 className="seccion-titulo" style={{ color: 'var(--texto-primario)', textTransform: 'none', letterSpacing: 'normal' }}>1. ¿Qué es Bookish?</h2>
              <p><strong>Bookish</strong> es un santuario digital para el bibliófilo. Más que una simple lista de libros, es un archivo dinámico diseñado con estética <strong>Art Déco</strong> donde podés registrar tus lecturas, medir el tiempo que pasás entre páginas y cartografiar los mundos que visitás.</p>
              <p>Diseñada como una aplicación de escritorio local, prioriza la privacidad y la elegancia, permitiéndote ser el único guardián de tu historial literario.</p>
            </div>

            <div className="seccion-bloque">
              <h2 className="seccion-titulo" style={{ color: 'var(--texto-primario)', textTransform: 'none', letterSpacing: 'normal' }}>2. Navegación y Diseño Noir</h2>
              <p>La aplicación utiliza un sistema de navegación adaptativo:</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <li>◆ <strong>Menú Superior</strong>: Acceso rápido a todas las secciones. En dispositivos móviles, se convierte en un elegante menú "hamburguesa" para optimizar el espacio.</li>
                <li>◆ <strong>Estética Art Déco</strong>: Uso de tipografías clásicas (Cinzel y EB Garamond), paleta en negro y oro, y micro-animaciones suaves que evocan la elegancia de los años 20.</li>
                <li>◆ <strong>Selector de Fechas</strong>: Al registrar libros o sesiones, disponés de un <em>DatePicker</em> personalizado que mantiene la coherencia visual Noir.</li>
              </ul>
            </div>

            <div className="seccion-bloque">
              <h2 className="seccion-titulo" style={{ color: 'var(--texto-primario)', textTransform: 'none', letterSpacing: 'normal' }}>3. La Biblioteca</h2>
              <p>Desde aquí gestionás tu colección. Podés filtrar por estado (<em>Por leer, Leyendo, Leído</em>) y buscar libros específicos.</p>
              <div style={{ margin: '1rem 0', border: '1px solid var(--oro-oscuro)', padding: '1rem', background: 'var(--sup-alta)', borderRadius: '2px' }}>
                <h3 style={{ color: 'var(--oro-primario)', marginBottom: '0.5rem', fontSize: '0.75rem', letterSpacing: '1px' }}>◆ INTERACCIÓN</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Los libros se presentan en un carrusel fluido. Hacé clic en la portada para entrar al <strong>Detalle del Libro</strong>, donde podés ver estadísticas específicas, notas y el temporizador.</p>
              </div>
            </div>

            <div className="seccion-bloque">
              <h2 className="seccion-titulo" style={{ color: 'var(--texto-primario)', textTransform: 'none', letterSpacing: 'normal' }}>4. Mapa de Mundos: Cartografía Literaria</h2>
              <p>Una de las funciones más avanzadas de Bookish es el mapa interactivo, donde podés situar geográficamente tus historias.</p>
              <ul style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <li><strong>Pins Personalizados:</strong> Hacé clic en cualquier lugar para agregar un pin. Diferenciá entre lugares <strong>Reales (◆)</strong> y <strong>Ficticios (◇)</strong>.</li>
                <li><strong>Vínculo con Libros:</strong> Asociá lugares a libros específicos. El pin heredará automáticamente el <strong>color distintivo</strong> que le hayas asignado al libro.</li>
                <li><strong>Navegación Inteligente:</strong> 
                  <ul style={{ marginTop: '0.4rem', listStyle: 'circle' }}>
                    <li><em>Click simple:</em> Enfoca el lugar y abre su ficha de datos.</li>
                    <li><em>Doble Click:</em> <strong>Zoom All</strong> — resetea la vista a un planisferio completo para ver toda tu red de viajes.</li>
                  </ul>
                </li>
                <li><strong>El Recorrido (Journey):</strong> Activá "VER RECORRIDO" al filtrar por un libro para trazar la ruta cronológica de la trama. Bookish numera las paradas y dibuja curvas elegantes que conectan los puntos.</li>
                <li><strong>Persistencia de Viaje:</strong> Si decidís "CERRAR RECORRIDO" (conectar el último punto con el primero), Bookish recordará esta preferencia para ese libro específico la próxima vez que abras la app.</li>
              </ul>
            </div>

            <div className="seccion-bloque">
              <h2 className="seccion-titulo" style={{ color: 'var(--texto-primario)', textTransform: 'none', letterSpacing: 'normal' }}>5. Gestión del Tiempo (Timers)</h2>
              <p>Mide cuánto tiempo real dedicás a cada libro. El cronómetro es persistente: si cerrás la aplicación accidentalmente, el tiempo se guarda para que no pierdas ni un minuto de tu registro.</p>
              <p>Al detener una sesión, podés ingresar un comentario breve o una reflexión sobre lo leído, que se guardará automáticamente en tu historial de sesiones.</p>
            </div>

            <div className="seccion-bloque">
              <h2 className="seccion-titulo" style={{ color: 'var(--texto-primario)', textTransform: 'none', letterSpacing: 'normal' }}>6. Inteligencia Visual y Reportes</h2>
              <p>Bookish analiza tus datos para mostrarte tendencias claras sobre tu comportamiento lector:</p>
              <ul style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <li><strong>Dashboard de Inteligencia:</strong> Gráficos de géneros, autores más leídos y evolución de tus calificaciones (estrellas) a lo largo del tiempo.</li>
                <li><strong>Metas de Lectura:</strong> Configurá un desafío anual (ej. leer 24 libros) y visualizá tu progreso en tiempo real.</li>
                <li><strong>Reportes Detallados:</strong> Filtra por día, mes o año para ver exactamente cuántas horas leíste y en qué libros invertiste más tiempo.</li>
              </ul>
            </div>

            <div className="seccion-bloque">
              <h2 className="seccion-titulo" style={{ color: 'var(--texto-primario)', textTransform: 'none', letterSpacing: 'normal' }}>7. Respaldo y Portabilidad</h2>
              <p>Tus datos residen en tu computadora, no en la nube. Por eso incluimos herramientas de respaldo robustas:</p>
              <div style={{ margin: '1rem 0', padding: '1.5rem', background: 'var(--sup-media)', border: '1px solid var(--oro-oscuro)', borderRadius: '4px' }}>
                <p style={{ marginBottom: '1rem' }}>Usa el icono de la <strong>NUBE</strong> en el menú para:</p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <li>◆ <strong>EXPORTAR ZIP</strong>: Empaqueta toda tu base de datos y todas las imágenes de portadas en un solo archivo.</li>
                  <li>◆ <strong>RESTAURAR</strong>: Recupera toda tu biblioteca desde un archivo de respaldo previo.</li>
                </ul>
              </div>
            </div>

            <div className="seccion-bloque">
              <h2 className="seccion-titulo" style={{ color: 'var(--texto-primario)', textTransform: 'none', letterSpacing: 'normal' }}>Preguntas frecuentes (FAQ)</h2>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div style={{ padding: '1.5rem', border: '1px double var(--oro-oscuro)', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '4px' }}>
                  <h3 style={{ color: 'var(--oro-primario)', fontSize: '0.9rem', marginBottom: '1.2rem', textAlign: 'center', letterSpacing: '2px' }}>◆ UBICACIÓN DE DATOS (Windows) ◆</h3>
                  
                  <div style={{ marginBottom: '1.2rem' }}>
                    <p style={{ margin: 0 }}>Toda tu información se encuentra en una ubicación segura fuera de la carpeta del programa para evitar pérdidas durante actualizaciones:</p>
                    <code style={{ display: 'block', marginTop: '0.5rem', padding: '0.5rem', background: 'var(--sup-alta)', fontSize: '0.75rem', color: 'var(--oro-primario)', border: '1px solid var(--sup-baja)' }}>%USERPROFILE%\Documents\Bookish\data\</code>
                  </div>

                  <div>
                    <h4 style={{ color: 'var(--blanco)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Archivo Principal:</h4>
                    <p style={{ margin: 0 }}><code>bookish.db</code> (Contiene libros, notas, sesiones y configuración del mapa).</p>
                  </div>
                </div>

                <div>
                  <h4 style={{ color: 'var(--oro-primario)', fontSize: '0.8rem' }}>¿Cómo agrego una portada personalizada?</h4>
                  <p>Entrá al detalle del libro, seleccioná <strong>EDITAR</strong> y subí cualquier imagen desde tu PC. Bookish la procesará y guardará automáticamente en tu archivo Noir.</p>
                </div>
                <div>
                  <h4 style={{ color: 'var(--oro-primario)', fontSize: '0.8rem' }}>¿Puedo usar Bookish sin conexión a internet?</h4>
                  <p>Sí, el 100% de la funcionalidad (excepto la carga inicial de los mapas, que requiere descargar los cuadros de imagen) funciona de forma totalmente local y privada.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <style>{`
        .guia-cuerpo {
          margin-top: var(--espacio-xl);
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
          padding-bottom: 5rem;
        }
        .guia-cuerpo ul, .guia-cuerpo ol {
          margin-bottom: 1.5rem;
        }
        .guia-cuerpo p {
          color: var(--texto-tenue);
          margin-bottom: 1rem;
        }
        .seccion-bloque {
          margin-bottom: 3rem;
        }
        .seccion-bloque strong {
          color: var(--oro-primario);
        }
      `}</style>
    </>
  )
}


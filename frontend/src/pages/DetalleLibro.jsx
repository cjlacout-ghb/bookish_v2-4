import { useState, useEffect, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import Estrellas from '../components/Estrellas.jsx'
import Timer from '../components/Timer.jsx'
import ModalNota from '../components/ModalNota.jsx'
import ModalColeccion from '../components/ModalColeccion.jsx'
import ModalEditarSesion from '../components/ModalEditarSesion.jsx'
import Header from '../components/Header.jsx'
import { API, getFileURL, getCapturaURL } from '../services/api.js'
import { formatTitle, formatAuthor } from '../services/textUtils.js'

const ESTADOS_OPCIONES = [
  { valor: 'por_leer', etiqueta: 'Por leer' },
  { valor: 'leyendo',  etiqueta: 'Leyendo' },
  { valor: 'leido',    etiqueta: 'Leídos' },
]

export default function DetalleLibro() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [libro, setLibro] = useState(null)
  const [notas, setNotas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [sesionEditando, setSesionEditando] = useState(null)
  const [totalSegundos, setTotalSegundos] = useState(0)
  const [sesionActiva, setSesionActiva] = useState(null)
  const [sesiones, setSesiones] = useState([])
  const [lugares, setLugares] = useState([])
  const [errorNotas, setErrorNotas] = useState(false)
  const [filtroActivo, setFiltroActivo] = useState(null)

  useEffect(() => {
    cargarLibro()
    cargarNotas()
    cargarSesionActiva()
    cargarSesiones()
    cargarLugares()
  }, [id])

  async function cargarLibro() {
    setCargando(true)
    try {
      const data = await API.getLibro(id)
      setLibro(data)
      setTotalSegundos(data.total_segundos || 0)
    } catch {
      navigate('/biblioteca')
    } finally {
      setCargando(false)
    }
  }

  async function cargarSesionActiva() {
    try {
      const activas = await API.getSesionesActivas()
      const mine = activas.find(s => String(s.libro_id) === String(id))
      setSesionActiva(mine || null)
    } catch {
      // no critical
    }
  }

  async function cargarSesiones() {
    try {
      const data = await API.getSesiones(id)
      // Solo mostrar sesiones finalizadas
      setSesiones(data.filter(s => !s.is_active))
    } catch {}
  }

  async function cargarNotas() {
    try {
      const data = await API.getNotas(id)
      setNotas(data)
      setErrorNotas(false)
    } catch {
      setErrorNotas(true)
    }
  }

  async function cargarLugares() {
    try {
      const data = await API.getMapLocations({ book_id: id })
      setLugares(data)
    } catch (e) {
      console.error("Error cargando lugares:", e)
    }
  }

  async function eliminarNota(notaId) {
    try {
      await API.eliminarNota(notaId)
      setNotas((prev) => prev.filter((n) => n.id !== notaId))
    } catch {}
  }

  function onNotaGuardada(nota) {
    setNotas((prev) => [nota, ...prev])
  }

  function onSesionGuardada(nuevoTotal, nuevaPagina) {
    setTotalSegundos(nuevoTotal)
    if (nuevaPagina !== undefined && nuevaPagina !== null) {
      setLibro(prev => ({ ...prev, pagina_actual: nuevaPagina }))
    }
    cargarSesiones()
  }

  function onSesionEditada(updated) {
    setSesiones(prev => prev.map(s => s.id === updated.id ? updated : s))
    setSesionEditando(null)
  }

  function handleNavegarBiblioteca(nuevoFiltro) {
    navigate('/biblioteca', { state: { filtro: nuevoFiltro } })
  }

  if (cargando) {
    return (
      <>
        <Header />
        <main className="pagina"><div className="cargando">◆ Cargando ◆</div></main>
      </>
    )
  }

  if (!libro) return null

  const etiquetas = libro.etiquetas
    ? libro.etiquetas.split(',').map((e) => e.trim()).filter(Boolean)
    : []

  const citas = notas.filter((n) => n.es_cita)
  const notasSolas = notas.filter((n) => !n.es_cita)

  return (
    <>
      {/* Cabecera */}
      <Header />

      <main className="pagina">
        <div className="detalle-libro animar-entrada">


          {/* Encabezado: portada + meta */}
          <div className="detalle-libro__encabezado">

            {/* Portada */}
            <div className="detalle-libro__portada">
              {libro.portada_filename ? (
                <img
                  src={getFileURL(libro.portada_filename)}
                  alt={`Portada de ${libro.titulo}`}
                />
              ) : (
                <div className="detalle-libro__portada-placeholder">
                  <span>◆</span>
                </div>
              )}
            </div>

            {/* Información */}
            <div className="detalle-libro__meta">
              <select 
                className={`badge-estado badge-estado-select badge-estado--${libro.estado}`}
                value={libro.estado}
                onChange={(e) => handleNavegarBiblioteca(e.target.value)}
                title="Ver otros libros de esta categoría"
              >
                {ESTADOS_OPCIONES.map((op) => (
                  <option key={op.valor} value={op.valor}>
                    {op.etiqueta.toUpperCase()}
                  </option>
                ))}
              </select>

              <h1 className="detalle-libro__titulo">{formatTitle(libro.titulo)}</h1>
              <p 
                className="detalle-libro__autor texto-interactivo" 
                onClick={() => setFiltroActivo({ tipo: 'autor', valor: formatAuthor(libro.autor) })}
                title={`Ver más libros de ${formatAuthor(libro.autor)}`}
                style={{ width: 'fit-content' }}
              >
                {formatAuthor(libro.autor)}
              </p>

              <Estrellas valor={libro.calificacion} soloLectura />

              {/* Atributos */}
              <div className="detalle-libro__atributos">
                {libro.genero && (
                  <div className="atributo">
                    <span className="atributo__clave">Género</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                      {libro.genero.split(',').map((g, i, arr) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
                          <span 
                            className="atributo__valor atributo__valor--interactivo"
                            onClick={() => setFiltroActivo({ tipo: 'género', valor: g.trim() })}
                            title={`Ver más libros del género: ${g.trim()}`}
                          >
                            {formatAuthor(g.trim())}
                          </span>
                          {i < arr.length - 1 && (
                            <span style={{ color: 'var(--texto-tenue)', marginLeft: '2px' }}>,</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {libro.formato && (
                  <div className="atributo">
                    <span className="atributo__clave">Formato</span>
                    <span 
                      className="atributo__valor atributo__valor--interactivo" 
                      style={{ textTransform: 'capitalize' }}
                      onClick={() => setFiltroActivo({ tipo: 'formato', valor: libro.formato })}
                      title={`Ver más libros en formato: ${libro.formato}`}
                    >
                      {libro.formato}
                    </span>
                  </div>
                )}
                <div className="atributo">
                  <span className="atributo__clave">Páginas</span>
                  <span className="atributo__valor">
                    {libro.pagina_actual || 0} / {libro.paginas || '—'}
                  </span>
                </div>
                {libro.editorial && (
                  <div className="atributo">
                    <span className="atributo__clave">Editorial</span>
                    <span 
                      className="atributo__valor atributo__valor--interactivo"
                      onClick={() => setFiltroActivo({ tipo: 'editorial', valor: libro.editorial })}
                      title={`Ver más libros de la editorial: ${libro.editorial}`}
                    >
                      {libro.editorial}
                    </span>
                  </div>
                )}
                {(libro.actual_edicion_anio || libro.primera_edicion_anio) && (
                  <div className="atributo">
                    <span className="atributo__clave">Año</span>
                    <span className="atributo__valor">{libro.actual_edicion_anio || libro.primera_edicion_anio}</span>
                  </div>
                )}

                {libro.isbn && (
                  <div className="atributo">
                    <span className="atributo__clave">ISBN</span>
                    <span className="atributo__valor" style={{ fontFamily: 'var(--fuente-cuerpo)', fontSize: '0.85rem' }}>
                      {libro.isbn}
                    </span>
                  </div>
                )}
              </div>

              {/* Etiquetas */}
              {etiquetas.length > 0 && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                  {etiquetas.map((e, i) => (
                    <span 
                      key={i} 
                      className={`etiqueta-chip ${filtroActivo?.valor === e ? 'etiqueta-chip--activa' : ''}`}
                      onClick={() => setFiltroActivo(filtroActivo?.valor === e ? null : { tipo: 'etiqueta', valor: e })}
                    >
                      {e}
                    </span>
                  ))}
                </div>
              )}

              {/* Acciones */}
              <div className="detalle-libro__acciones">
                <button
                  id="btn-ver-mas-datos"
                  className="btn btn-secundario"
                  onClick={() => navigate(`/libro/${id}/editar`)}
                >
                  ◆ VER + DATOS
                </button>
              </div>
            </div>
          </div>

          {/* Timer (solo si está leyendo) - MOVED UP for prominence */}
          {libro.estado === 'leyendo' && (
            <div style={{ marginBottom: 'var(--espacio-xl)' }}>
              <Timer
                libroId={libro.id}
                totalSegundos={totalSegundos}
                sesionActiva={sesionActiva}
                paginaInicial={libro.pagina_actual || 0}
                onSesionGuardada={onSesionGuardada}
                onSesionActiva={setSesionActiva}
              />
            </div>
          )}

          {/* Reseña */}
          {libro.resena && (
            <section className="seccion-bloque" aria-label="Reseña personal">
              <h2 className="seccion-titulo" style={{ color: 'var(--texto-primario)', textTransform: 'none', letterSpacing: 'normal' }}>◆ Reseña personal</h2>
              <blockquote className="resena-bloque">{libro.resena}</blockquote>
            </section>
          )}


          {/* Notas y Citas */}
          <section className="seccion-bloque" aria-label="Notas y citas">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--espacio-md)' }}>
              <h2 className="seccion-titulo" style={{ marginBottom: 0, color: 'var(--texto-primario)', textTransform: 'none', letterSpacing: 'normal' }}>◈ Notas y citas</h2>
              <button
                id="btn-nueva-nota"
                className="btn btn-primario"
                onClick={() => setMostrarModal(true)}
              >
                ◆ NUEVA
              </button>
            </div>

            {notas.length === 0 ? (
              errorNotas ? (
                <div className="estado-vacio" style={{ padding: 'var(--espacio-lg)' }}>
                  <span className="estado-vacio__ornamento" style={{ color: 'var(--texto-error)' }}>◈</span>
                  No se pudieron cargar las notas. Verificá la conexión.
                </div>
              ) : (
                <div className="estado-vacio" style={{ padding: 'var(--espacio-lg)' }}>
                  <span className="estado-vacio__ornamento">◈</span>
                  Todavía no hay notas para este libro.
                </div>
              )
            ) : (
              <>
                {/* Notas */}
                {notasSolas.map((nota) => (
                  <MemoizedNotaItem key={nota.id} nota={nota} onEliminar={eliminarNota} />
                ))}

                {notasSolas.length > 0 && citas.length > 0 && (
                  <div className="ornamento-divisor">◇</div>
                )}

                {/* Citas */}
                {citas.length > 0 && (
                  <>
                    <p className="seccion-titulo" style={{ fontSize: '0.58rem', marginBottom: 'var(--espacio-sm)' }}>
                      Citas textuales
                    </p>
                    {citas.map((nota) => (
                      <MemoizedNotaItem key={nota.id} nota={nota} onEliminar={eliminarNota} />
                    ))}
                  </>
                )}
              </>
            )}
          </section>

          {/* Lugares del Mundo (Mapa) */}
          {lugares.length > 0 && (
            <section className="seccion-bloque" aria-label="Lugares del mundo">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--espacio-md)' }}>
                <h2 className="seccion-titulo" style={{ marginBottom: 0, color: 'var(--texto-primario)', textTransform: 'none', letterSpacing: 'normal' }}>◈ Lugares del mundo</h2>
                <button
                  className="btn btn-secundario"
                  onClick={() => navigate('/mapa-de-mundos', { state: { focusBookId: id } })}
                  title="Ver todos en el mapa"
                  style={{ fontSize: '0.65rem', padding: '4px 10px' }}
                >
                  VER MAPA ◆
                </button>
              </div>
              
              {(() => {
                const paradas = lugares.filter(l => l.is_journey_point !== false);
                const aislados = lugares.filter(l => l.is_journey_point === false);
                
                return (
                  <>
                    {paradas.length > 0 && (
                      <>
                        <h3 className="seccion-titulo" style={{ fontSize: '0.65rem', margin: 'var(--espacio-sm) 0 var(--espacio-xs)', opacity: 0.8 }}>Paradas del recorrido</h3>
                        <div className="lugares-grid" style={{ marginBottom: aislados.length > 0 ? 'var(--espacio-md)' : 0 }}>
                          {paradas.map((loc, index) => (
                            <div key={loc.id} className="nota-item nota-item--interactiva" onClick={() => navigate('/mapa-de-mundos', { state: { focusLocationId: loc.id } })}>
                              <span className="nota-item__ornamento" style={{ color: libro.color || 'var(--oro)', fontSize: '1.2rem', fontFamily: 'var(--fuente-titulos)', fontWeight: 'bold' }}>
                                {index + 1}
                              </span>
                              <div className="nota-item__cuerpo">
                                <p className="nota-item__tipo">
                                  {loc.place_type.toUpperCase()} — {loc.is_fictional ? 'FICTICIO' : 'REAL'}
                                </p>
                                <p className="nota-item__texto" style={{ fontWeight: 'bold', letterSpacing: '1px' }}>
                                  {loc.name.toUpperCase()}
                                </p>
                                {loc.note && (
                                  <p className="nota-item__texto" style={{ marginTop: '0.2rem', fontSize: '0.85rem', opacity: 0.8 }}>
                                    {loc.note}
                                  </p>
                                )}
                              </div>
                              <div className="nota-item__flecha">→</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {aislados.length > 0 && (
                      <>
                        <h3 className="seccion-titulo" style={{ fontSize: '0.65rem', margin: 'var(--espacio-sm) 0 var(--espacio-xs)', opacity: 0.8 }}>Otros lugares</h3>
                        <div className="lugares-grid">
                          {aislados.map(loc => (
                            <div key={loc.id} className="nota-item nota-item--interactiva" onClick={() => navigate('/mapa-de-mundos', { state: { focusLocationId: loc.id } })}>
                              <span className="nota-item__ornamento" style={{ color: libro.color || 'var(--oro)' }}>
                                {loc.is_fictional ? '◇' : '◆'}
                              </span>
                              <div className="nota-item__cuerpo">
                                <p className="nota-item__tipo">
                                  {loc.place_type.toUpperCase()} — {loc.is_fictional ? 'FICTICIO' : 'REAL'}
                                </p>
                                <p className="nota-item__texto" style={{ fontWeight: 'bold', letterSpacing: '1px' }}>
                                  {loc.name.toUpperCase()}
                                </p>
                                {loc.note && (
                                  <p className="nota-item__texto" style={{ marginTop: '0.2rem', fontSize: '0.85rem', opacity: 0.8 }}>
                                    {loc.note}
                                  </p>
                                )}
                              </div>
                              <div className="nota-item__flecha">→</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </section>
          )}

          {/* Historial de Lectura (Sesiones) */}
          {sesiones.length > 0 && (
            <section className="seccion-bloque" aria-label="Historial de lectura">
              <h2 className="seccion-titulo" style={{ marginBottom: 'var(--espacio-md)', color: 'var(--texto-primario)', textTransform: 'none', letterSpacing: 'normal' }}>◈ Historial de lectura</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espacio-md)' }}>
                {sesiones.map((sesion) => (
                  <div key={sesion.id} className="nota-item">
                    <span className="nota-item__ornamento">⏱</span>
                    <div className="nota-item__cuerpo">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p className="nota-item__tipo">
                          {new Date(sesion.iniciado_en).toLocaleDateString()} 
                          {' - '}
                          {Math.floor(sesion.duracion_segundos / 60)} min
                        </p>
                        <button 
                          className="btn-icono" 
                          title="Editar sesión" 
                          onClick={() => setSesionEditando(sesion)}
                          style={{ padding: '4px' }}
                        >
                          ✎
                        </button>
                      </div>
                      {sesion.session_note && (
                        <p className="nota-item__texto" style={{ marginTop: '0.2rem' }}>{sesion.session_note}</p>
                      )}
                      {sesion.captura_filename && (
                        <div style={{ marginTop: 'var(--espacio-sm)' }}>
                          <a href={getCapturaURL(sesion.captura_filename)} target="_blank" rel="noreferrer">
                            <img 
                              src={getCapturaURL(sesion.captura_filename)} 
                              alt="Captura de lectura" 
                              style={{ 
                                maxWidth: '100%', 
                                maxHeight: '200px', 
                                objectFit: 'cover', 
                                borderRadius: '4px', 
                                border: '1px solid var(--borde-tenue)' 
                              }}
                            />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>

      {/* Modal de nueva nota */}
      {mostrarModal && (
        <ModalNota
          libroId={libro.id}
          onCerrar={() => setMostrarModal(false)}
          onGuardada={onNotaGuardada}
        />
      )}

      {/* Modal de Colección (Libros relacionados) */}
      <ModalColeccion 
        filtro={filtroActivo} 
        onClose={() => setFiltroActivo(null)} 
      />

      {/* Modal de edición de sesión */}
      {sesionEditando && (
        <ModalEditarSesion
          sesion={sesionEditando}
          onCerrar={() => setSesionEditando(null)}
          onGuardada={onSesionEditada}
        />
      )}
    </>
  )
}

/* ── Componente interno: ítem de nota ───────────────────────────────────── */
function NotaItem({ nota, onEliminar }) {
  const [confirmando, setConfirmando] = useState(false)

  return (
    <div className={`nota-item${nota.es_cita ? ' nota-item--cita' : ''}`}>
      <span className="nota-item__ornamento">
        {nota.es_cita ? '❝' : '◇'}
      </span>
      <div className="nota-item__cuerpo">
        <p className="nota-item__tipo">{nota.es_cita ? 'Cita textual' : 'Nota'}</p>
        <p className="nota-item__texto">{nota.contenido}</p>
        {nota.numero_pagina && (
          <p className="nota-item__pagina">pág. {nota.numero_pagina}</p>
        )}
      </div>
      {!confirmando ? (
        <button
          className="nota-item__eliminar"
          onClick={() => setConfirmando(true)}
          aria-label="Eliminar nota"
          title="Eliminar"
        >
          ✕
        </button>
      ) : (
        <div className="btn-alerta">
          <span className="btn-alerta__texto">¿BORRAR?</span>
          <button
            className="btn btn-sm btn-peligro"
            onClick={() => onEliminar(nota.id)}
          >
            SÍ
          </button>
          <button
            className="btn btn-sm btn-secundario"
            onClick={() => setConfirmando(false)}
          >
            NO
          </button>
        </div>
      )}
    </div>
  )
}

NotaItem.propTypes = {
  nota: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    es_cita: PropTypes.bool,
    contenido: PropTypes.string,
    numero_pagina: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }).isRequired,
  onEliminar: PropTypes.func.isRequired
}

const MemoizedNotaItem = memo(NotaItem);

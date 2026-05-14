import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Header from '../components/Header';
import './MapaDeMundos.css';
import { API, BASE_URL } from '../services/api';

// MAP_PALETTE removed: using native color picker

// ── Custom pin icons ─────────────────────────────────────────────────────────
function createPinIcon(fictional, order = null, customColor = null) {
  const defaultGold = fictional ? '#e8d9a0' : '#c9a84c';
  const color = customColor || defaultGold;
  const char  = fictional ? '◇' : '◆';
  
  let content = char;
  if (order !== null) {
    content = `
      <div style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
        <span style="color:${color}; font-size:32px;">${char}</span>
        <span style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-family:'Cinzel', serif; font-size:11px; color:#0d0d0d; font-weight:bold; pointer-events:none; margin-top:-1px;">${order}</span>
      </div>
    `;
  }

  return L.divIcon({
    className: '',
    iconSize: [32, 48],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
    html: `<div class="mapa-pin ${fictional ? 'mapa-pin--ficticio' : 'mapa-pin--real'}" style="color:${color}">${content}</div>`,
  });
}

// ── Recorrido map behavior ───────────────────────────────────────────────────
function RecorridoEffect({ showRecorrido, locations }) {
  const map = useMap();
  useEffect(() => {
    if (showRecorrido && locations.length > 1) {
      const bounds = L.latLngBounds(locations.map(l => [l.latitude, l.longitude]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, [showRecorrido, locations, map]);
  return null;
}

// ── Map event handler (clears hover/handles clicks) ────────────────────────
function MapEvents({ onMapClick, onClearHover }) {
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  useMapEvents({
    click: (e) => {
      if (onMapClickRef.current) onMapClickRef.current(e.latlng);
    },
    mouseover: () => onClearHover(), // Moving from marker to map
    dragstart: () => onClearHover(), // Map starts dragging
  });
  return null;
}

// ── Fly to marker helper ─────────────────────────────────────────────────────
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      const currentZoom = map.getZoom();
      const targetZoom = Math.max(currentZoom, 10); // Audit: Better focus on specific locations
      map.flyTo([target.lat, target.lng], targetZoom, { 
        duration: 1.8, 
        easeLinearity: 0.25 
      });
    }
  }, [target, map]);
  return null;
}

// ── Conditional Label Layer ──────────────────────────────────────────────────
function LabelLayer({ isPopupOpen, showRecorrido }) {
  // Disminuye dramáticamente la opacidad si hay una tarjeta abierta o un recorrido activo
  const currentOpacity = (isPopupOpen || showRecorrido) ? 0.15 : 0.9;
  return (
    <TileLayer
      url="https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
      attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
      opacity={currentOpacity}
      zIndex={1000}
      updateWhenZooming={false}
      updateWhenIdle={true}
      keepBuffer={0}
    />
  );
}

// ── Helper: Curved path between two points ──────────────────────────────────
function getCurvePoints(p1, p2, offset = 0.12) {
  const points = [];
  const segments = 32;
  
  const midLat = (p1[0] + p2[0]) / 2;
  const midLng = (p1[1] + p2[1]) / 2;
  
  const dLat = p2[0] - p1[0];
  const dLng = p2[1] - p1[1];
  
  // Perpendicular vector for the "bulge"
  const pLat = -dLng;
  const pLng = dLat;
  
  const cLat = midLat + pLat * offset;
  const cLng = midLng + pLng * offset;
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = Math.pow(1 - t, 2) * p1[0] + 2 * (1 - t) * t * cLat + Math.pow(t, 2) * p2[0];
    const lng = Math.pow(1 - t, 2) * p1[1] + 2 * (1 - t) * t * cLng + Math.pow(t, 2) * p2[1];
    points.push([lat, lng]);
  }
  return points;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MapaDeMundos() {
  const [locations, setLocations]     = useState([]);
  const [books, setBooks]             = useState([]);
  const [filterBook, setFilterBook]   = useState('');
  const [filterType, setFilterType]   = useState('');
  const [filterOrigin, setFilterOrigin] = useState('TODOS');
  const [showRecorrido, setShowRecorrido] = useState(false);
  const [closeRecorrido, setCloseRecorrido] = useState(false);
  const [panelOpen, setPanelOpen]     = useState(false);
  const location = useLocation();
  const hasFocused = useRef(false);

  // Reset journey state when the selected book changes
  useEffect(() => {
    setShowRecorrido(false);
    setCloseRecorrido(false);
  }, [filterBook]);
  const [newPinLatLng, setNewPinLatLng] = useState(null);
  const [flyTarget, setFlyTarget]     = useState(null);

  // Popup state
  const [activePin, setActivePin]     = useState(null); // location object
  const [popupMode, setPopupMode]     = useState('view'); // 'view' | 'edit' | 'confirm-delete'
  const [popupPos, setPopupPos]       = useState(null);  // screen {x,y} relative to map

  // Form state
  const emptyForm = { name: '', place_type: 'ciudad', is_fictional: false, note: '', book_id: '', color: '#c9a84c' };
  const [form, setForm]               = useState(emptyForm);
  const [initialBookColor, setInitialBookColor] = useState('#c9a84c');
  const [formError, setFormError]     = useState('');

  const mapRef = useRef(null);
  const popupRef = useRef(null);

  // Hover tooltip
  const [hoverPin, setHoverPin]   = useState(null);
  const [hoverPos, setHoverPos]   = useState({ x: 0, y: 0 });

  // Compute fixed position that never exits the viewport
  function smartPos(mouseX, mouseY) {
    const TW = 270; // tooltip max-width
    const TH = 200; // estimated max-height
    const OFF = 20;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = mouseX + OFF;
    let y = mouseY - TH - OFF; // Default: above-right

    // Flip horizontally if too close to right edge
    if (x + TW > vw - 15) {
      x = mouseX - TW - OFF;
    }
    // Flip vertically if too close to top edge
    if (y < 70) { // 70px to account for header height
      y = mouseY + OFF;
    }
    // Final clamping just in case
    if (x < 12) x = 12;
    if (y + TH > vh - 12) y = vh - TH - 12;

    return { left: x, top: y };
  }

  // Robust fallback: if mouse is not over a marker, ensure tooltip is closed
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (hoverPin) {
        const isHoveringMarker = e.target.closest('.leaflet-marker-icon');
        if (!isHoveringMarker) {
          setHoverPin(null);
        }
      }
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [hoverPin]);

  // ── Load data on mount ──────────────────────────────────────────────────
  useEffect(() => {
    API.getMapLocations()
      .then(setLocations)
      .catch(console.error);
    API.getLibros()
      .then(setBooks)
      .catch(console.error);
  }, []);

  // ── Marker click → open popup ───────────────────────────────────────────
  const handleMarkerClick = useCallback((loc, e) => {
    e?.originalEvent?.stopPropagation();
    e?.stopPropagation?.();
    setNewPinLatLng(null);
    setActivePin(loc);
    setPopupMode('view');
    setFlyTarget({ lat: loc.latitude, lng: loc.longitude, t: Date.now() });
  }, []);

  // ── Handle incoming state (focus from other pages) ────────────────────────
  useEffect(() => {
    if (locations.length > 0 && books.length > 0 && !hasFocused.current) {
      if (location.state?.focusLocationId) {
        const target = locations.find(l => l.id === location.state.focusLocationId);
        if (target) {
          handleMarkerClick(target);
          if (target.book) setFilterBook(String(target.book.id));
          hasFocused.current = true;
        }
      } else if (location.state?.focusBookId) {
        setFilterBook(String(location.state.focusBookId));
        setShowRecorrido(true);
        hasFocused.current = true;
      }
    }
  }, [locations, books, location.state, handleMarkerClick]);

  // ── Filtered locations ──────────────────────────────────────────────────
  const visible = locations.filter(loc => {
    if (filterBook && String(loc.book?.id) !== filterBook) return false;
    if (filterType && loc.place_type !== filterType) return false;
    if (filterOrigin === 'REALES'   && loc.is_fictional)  return false;
    if (filterOrigin === 'FICTICIOS' && !loc.is_fictional) return false;
    return true;
  }).sort((a, b) => a.id - b.id);

  const visibleReales = visible.filter(l => !l.is_fictional);
  const visibleFicticios = visible.filter(l => l.is_fictional);

  // Books that have at least one pin
  const booksWithPins = books.filter(b => locations.some(l => l.book?.id === b.id));

  // ── Map click → open new-pin form ──────────────────────────────────────
  const handleMapClick = useCallback((latlng) => {
    if (activePin) { setActivePin(null); return; }
    setNewPinLatLng(latlng);
    setForm({ ...emptyForm, color: '#c9a84c' });
    setInitialBookColor('#c9a84c');
    setFormError('');
  }, [activePin, emptyForm]);

  // Update form color when book_id changes
  useEffect(() => {
    if (form.book_id) {
      const book = books.find(b => String(b.id) === form.book_id);
      if (book) {
        setForm(f => ({ ...f, color: book.color || '#c9a84c' }));
        setInitialBookColor(book.color || '#c9a84c');
      }
    } else {
      setForm(f => ({ ...f, color: '#c9a84c' }));
      setInitialBookColor('#c9a84c');
    }
  }, [form.book_id, books]);



  // ── Save new pin ────────────────────────────────────────────────────────
  const handleSaveNew = async () => {
    if (!form.name.trim()) { setFormError('El nombre es obligatorio.'); return; }
    
    try {
      // 1. If book color changed, update the book first
      if (form.book_id && form.color !== initialBookColor) {
        const resBook = await fetch(`${BASE_URL}/api/libros/${form.book_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color: form.color }),
        });
        if (!resBook.ok) { setFormError('Error al actualizar el color del libro.'); return; }
        const updatedBook = await resBook.json();
        setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
      }

      // 2. Create the location
      const body = {
        name: form.name.trim(),
        place_type: form.place_type,
        is_fictional: form.is_fictional,
        note: form.note || null,
        latitude: newPinLatLng.lat,
        longitude: newPinLatLng.lng,
        book_id: form.book_id ? parseInt(form.book_id) : null,
      };
      const res = await fetch(`${BASE_URL}/api/map/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setFormError('Error al guardar el lugar.'); return; }
      const created = await res.json();
      
      // Update local locations to reflect the new pin AND update existing pins if the book color changed
      setLocations(prev => {
        const updatedList = prev.map(l => {
          if (l.book && String(l.book.id) === form.book_id) {
            return { ...l, book: { ...l.book, color: form.color } };
          }
          return l;
        });
        return [...updatedList, created];
      });
      
      setNewPinLatLng(null);
    } catch (err) {
      console.error(err);
      setFormError('Error de conexión con el servidor.');
    }
  };

  // ── Save edit ───────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!form.name.trim()) { setFormError('El nombre es obligatorio.'); return; }

    try {
      // 1. If book color changed, update the book first
      if (form.book_id && form.color !== initialBookColor) {
        const resBook = await fetch(`${API}/libros/${form.book_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color: form.color }),
        });
        if (!resBook.ok) { setFormError('Error al actualizar el color del libro.'); return; }
        const updatedBook = await resBook.json();
        setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
      }

      const body = {
        name: form.name.trim(),
        place_type: form.place_type,
        is_fictional: form.is_fictional,
        note: form.note || null,
        book_id: form.book_id ? parseInt(form.book_id) : null,
      };
      const res = await fetch(`${BASE_URL}/api/map/locations/${activePin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setFormError('Error al guardar el lugar.'); return; }
      const updated = await res.json();
      
      // Update local locations state immutably to reflect the new color if the book was updated
      setLocations(prev => prev.map(l => {
        let next = l.id === updated.id ? updated : l;
        // Also ensure existing pins of the same book get the new color in the local state
        if (next.book && String(next.book.id) === form.book_id) {
          return { ...next, book: { ...next.book, color: form.color } };
        }
        return next;
      }));
      
      setActivePin(updated);
      setPopupMode('view');
    } catch (err) {
      console.error(err);
      setFormError('Error de conexión con el servidor.');
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    await fetch(`${BASE_URL}/api/map/locations/${activePin.id}`, { method: 'DELETE' });
    setLocations(prev => prev.filter(l => l.id !== activePin.id));
    setActivePin(null);
  };

  // ── Open edit form ──────────────────────────────────────────────────────
  const handleEditClick = () => {
    setForm({
      name: activePin.name,
      place_type: activePin.place_type,
      is_fictional: activePin.is_fictional,
      note: activePin.note || '',
      book_id: activePin.book ? String(activePin.book.id) : '',
      color: activePin.book?.color || '#c9a84c',
    });
    setInitialBookColor(activePin.book?.color || '#c9a84c');
    setFormError('');
    setPopupMode('edit');
  };

  // ── Reset filters ───────────────────────────────────────────────────────
  const clearFilters = () => { setFilterBook(''); setFilterType(''); setFilterOrigin('TODOS'); };

  const TIPOS = ['ciudad', 'reino', 'país', 'región', 'continente', 'otro'];

  return (
    <div className="mapa-wrapper">
      <Header />

      <div className="mapa-layout">
        {/* ── Filter panel ─────────────────────────────────────────────── */}
        <aside className={`mapa-panel ${panelOpen ? 'mapa-panel--open' : ''}`}>
          <button className="mapa-panel__tab" onClick={() => setPanelOpen(o => !o)} aria-label="Filtros">
            <span className="mapa-panel__tab-label">FILTROS</span>
          </button>
          <div className="mapa-panel__body">
            <div className="mapa-panel__title">FILTROS</div>
            <div className="mapa-panel__sep" />

            <div className="mapa-panel__group">
              <label className="mapa-panel__label">Por libro</label>
              <select
                className="mapa-panel__select"
                value={filterBook}
                onChange={e => setFilterBook(e.target.value)}
              >
                <option value="">Todos los libros</option>
                {booksWithPins.map(b => (
                  <option key={b.id} value={String(b.id)}>{b.titulo}</option>
                ))}
              </select>
              
              {filterBook && visible.length > 0 && (
                <>
                  <button 
                    className={`mapa-recorrido-btn ${showRecorrido ? 'mapa-recorrido-btn--active' : ''}`}
                    onClick={() => {
                      setShowRecorrido(!showRecorrido);
                      setActivePin(null);
                    }}
                  >
                    {showRecorrido ? '◆ OCULTAR RECORRIDO' : '◇ VER RECORRIDO'}
                  </button>
                  {showRecorrido && visible.length === 1 && (
                    <div className="mapa-recorrido-note">
                      Un solo lugar registrado. Agrega más pins para ver el recorrido.
                    </div>
                  )}
                  {showRecorrido && visible.length > 2 && (
                    <button
                      className={`mapa-recorrido-btn ${closeRecorrido ? 'mapa-recorrido-btn--active' : ''}`}
                      style={{ marginTop: '0.5rem' }}
                      onClick={() => {
                        setCloseRecorrido(!closeRecorrido);
                      }}
                    >
                      {closeRecorrido ? '◆ RECORRIDO CERRADO' : '◇ CERRAR RECORRIDO'}
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="mapa-panel__group">
              <label className="mapa-panel__label">Por tipo</label>
              <select
                className="mapa-panel__select"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              >
                <option value="">Todos</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="mapa-panel__group">
              <label className="mapa-panel__label">Origen</label>
              <div className="mapa-panel__origin-btns">
                {['TODOS', 'REALES', 'FICTICIOS'].map(o => (
                  <button
                    key={o}
                    className={`mapa-origin-btn ${filterOrigin === o ? 'mapa-origin-btn--active' : ''}`}
                    onClick={() => setFilterOrigin(o)}
                  >{o}</button>
                ))}
              </div>
            </div>

            <button className="mapa-panel__clear" onClick={clearFilters}>LIMPIAR FILTROS</button>
          </div>
        </aside>

        {/* ── Map container ─────────────────────────────────────────────── */}
        <div className="mapa-container">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            minZoom={2}
            maxZoom={18}
            maxBounds={[[-90, -180], [90, 180]]}
            maxBoundsViscosity={1.0}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
            ref={mapRef}
          >
            {/* Dark base — no labels */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              maxZoom={18}
            />
            {/* English-only labels overlay (ESRI Dark Gray Reference) - disappears on zoom in */}
            <LabelLayer 
              isPopupOpen={!!(activePin || newPinLatLng)} 
              showRecorrido={showRecorrido && filterBook !== ''}
            />
            
            <MapEvents onMapClick={handleMapClick} onClearHover={() => setHoverPin(null)} />
            {flyTarget && <FlyTo target={flyTarget} />}
            <RecorridoEffect showRecorrido={showRecorrido && filterBook !== ''} locations={visible} />

            {showRecorrido && filterBook !== '' && visible.length > 1 && (
              <>
                {(() => {
                  const fullPath = [...visible.map(loc => [loc.latitude, loc.longitude])];
                  if (closeRecorrido && visible.length > 2) {
                    fullPath.push([visible[0].latitude, visible[0].longitude]);
                  }
                  
                  const segments = [];
                  for (let i = 0; i < fullPath.length - 1; i++) {
                    segments.push(getCurvePoints(fullPath[i], fullPath[i+1]));
                  }
                  
                  return segments.map((pts, i) => (
                    <Polyline
                      key={`curve-${i}`}
                      positions={pts}
                      pathOptions={{
                        color: visible[0]?.book?.color || '#c9a84c',
                        weight: 1.5,
                        opacity: 0.6,
                        dashArray: '6, 8'
                      }}
                      smoothFactor={1}
                      interactive={false}
                    />
                  ));
                })()}
              </>
            )}

            {visible.map((loc, index) => (
              <Marker
                key={loc.id}
                position={[loc.latitude, loc.longitude]}
                icon={createPinIcon(loc.is_fictional, (showRecorrido && filterBook !== '') ? index + 1 : null, loc.book?.color)}
                eventHandlers={{
                  click:      (e) => handleMarkerClick(loc, e),
                  mouseover:  (e) => { setHoverPin(loc); setHoverPos({ x: e.originalEvent.clientX, y: e.originalEvent.clientY }); },
                  mousemove:  (e) => { setHoverPos({ x: e.originalEvent.clientX, y: e.originalEvent.clientY }); },
                  mouseout:   ()  => setHoverPin(null),
                }}
              />
            ))}

            {/* Temp new-pin marker while form is open */}
            {newPinLatLng && (
              <Marker
                position={[newPinLatLng.lat, newPinLatLng.lng]}
                icon={createPinIcon(form.is_fictional)}
              />
            )}
          </MapContainer>

          {/* ── Pin counter & dropdown ───────────────────────────────────── */}
          <div className="mapa-counter-wrapper">
            <button className="mapa-counter-btn">
              <span className="mapa-counter__text">
                {visible.length} <span className="mapa-counter__sep">de</span> {locations.length} <span className="mapa-counter__sep">lugares</span>
              </span>
            </button>
            
            {(visibleReales.length > 0 || visibleFicticios.length > 0) && (
              <div className="mapa-counter-dropdown">
                {visibleReales.length > 0 && (
                  <div className="mapa-counter-group">
                    <div className="mapa-counter-group-title">◆ REALES</div>
                    <ul className="mapa-counter-list">
                      {visibleReales.map(l => (
                        <li 
                          key={l.id} 
                          className="mapa-counter-list-item"
                          onClick={(e) => handleMarkerClick(l, e)}
                          style={{ cursor: 'pointer', '--bullet-color': l.book?.color || '#9a8040' }}
                        >
                          {l.name}
                          {l.book && (
                            <span style={{ color: l.book.color, fontStyle: 'italic' }}>
                              {` — ${l.book.title}`}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {visibleFicticios.length > 0 && (
                  <div className="mapa-counter-group">
                    <div className="mapa-counter-group-title">◇ FICTICIOS</div>
                    <ul className="mapa-counter-list">
                      {visibleFicticios.map(l => (
                        <li 
                          key={l.id} 
                          className="mapa-counter-list-item"
                          onClick={(e) => handleMarkerClick(l, e)}
                          style={{ cursor: 'pointer', '--bullet-color': l.book?.color || '#9a8040' }}
                        >
                          {l.name}
                          {l.book && (
                            <span style={{ color: l.book.color, fontStyle: 'italic' }}>
                              {` — ${l.book.title}`}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Empty state ───────────────────────────────────────────── */}
          {locations.length === 0 && (
            <div className="mapa-empty">
              <p className="mapa-empty__title">Ningún mundo ha sido cartografiado aún.</p>
              <p className="mapa-empty__hint">Haz clic en cualquier punto del mapa para agregar tu primer lugar.</p>
            </div>
          )}

          {/* ── Hover tooltip (fixed, never clipped) ─────────────────── */}
          {hoverPin && !activePin && (
            <div className="mapa-hover-card" style={smartPos(hoverPos.x, hoverPos.y)}>
              <div className="mapa-tooltip__name">{hoverPin.name.toUpperCase()}</div>
              <div className="mapa-tooltip__type">
                {hoverPin.place_type?.toUpperCase()}&nbsp;&nbsp;
                {hoverPin.is_fictional ? '◇ FICTICIO' : '◆ REAL'}
              </div>
              {hoverPin.book && (
                <div className="mapa-tooltip__book">
                  <em>{hoverPin.book.title}</em>
                  <span className="mapa-tooltip__book-author"> — {hoverPin.book.author}</span>
                </div>
              )}
              {hoverPin.note && (
                <div className="mapa-tooltip__note">{hoverPin.note}</div>
              )}
              <div className="mapa-tooltip__coords">
                {hoverPin.latitude.toFixed(4)}°&nbsp;&nbsp;{hoverPin.longitude.toFixed(4)}°
              </div>
            </div>
          )}

          {/* ── New pin popup form ────────────────────────────────────── */}
          {newPinLatLng && (
            <div className="mapa-popup mapa-popup--form">
              <div className="mapa-popup__header">
                <span className="mapa-popup__header-title">NUEVO LUGAR</span>
              </div>
              <div className="mapa-popup__body">
                <div className="mapa-form__group">
                  <label className="mapa-form__label">Nombre del lugar *</label>
                  <input
                    className="mapa-form__input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="ej. Mordor, París…"
                    autoFocus
                  />
                </div>
                <div className="mapa-form__row">
                  <div className="mapa-form__group">
                    <label className="mapa-form__label">Tipo</label>
                    <select
                      className="mapa-form__select"
                      value={form.place_type}
                      onChange={e => setForm(f => ({ ...f, place_type: e.target.value }))}
                    >
                      {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="mapa-form__group">
                    <label className="mapa-form__label">Origen</label>
                    <div className="mapa-toggle">
                      <button
                        className={`mapa-toggle__btn ${!form.is_fictional ? 'mapa-toggle__btn--active' : ''}`}
                        onClick={() => setForm(f => ({ ...f, is_fictional: false }))}
                      >Real</button>
                      <button
                        className={`mapa-toggle__btn ${form.is_fictional ? 'mapa-toggle__btn--active' : ''}`}
                        onClick={() => setForm(f => ({ ...f, is_fictional: true }))}
                      >Ficticio</button>
                    </div>
                  </div>
                </div>
                <div className="mapa-form__group">
                  <label className="mapa-form__label">Vincular a libro</label>
                  <select
                    className="mapa-form__select"
                    value={form.book_id}
                    onChange={e => setForm(f => ({ ...f, book_id: e.target.value }))}
                  >
                    <option value="">Sin libro</option>
                    {books.map(b => (
                      <option key={b.id} value={String(b.id)}>{b.titulo} — {b.autor}</option>
                    ))}
                  </select>
                </div>
                {form.book_id && (
                  <div className="mapa-form__group">
                    <label className="mapa-form__label">Color del libro</label>
                    <div className="mapa-form__color-row">
                        <input
                          type="color"
                          className="mapa-color-picker"
                          value={form.color}
                          onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                          title="Elegir color"
                        />
                      <input
                        className="mapa-form__color-hex"
                        value={form.color}
                        onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                        placeholder="#RRGGBB"
                        maxLength={7}
                      />
                    </div>
                  </div>
                )}
                <div className="mapa-form__group">
                  <label className="mapa-form__label">Nota</label>
                  <textarea
                    className="mapa-form__textarea"
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="ej. aquí transcurre el capítulo 3…"
                    maxLength={300}
                    rows={3}
                  />
                </div>
                {formError && <p className="mapa-form__error">{formError}</p>}
              </div>
              <div className="mapa-popup__footer">
                <button className="mapa-btn-save" onClick={handleSaveNew}>GUARDAR ◆</button>
                <button className="mapa-btn-cancel" onClick={() => setNewPinLatLng(null)}>CANCELAR</button>
              </div>
            </div>
          )}

          {/* ── Existing pin popup ────────────────────────────────────── */}
          {activePin && (
            <div className={`mapa-popup ${popupMode === 'view' ? 'mapa-popup--center' : ''}`}>
              {popupMode === 'view' && (
                <>
                  <div className="mapa-popup__header">
                    <span className="mapa-popup__place-name">{activePin.name.toUpperCase()}</span>
                    <button className="mapa-popup__close" onClick={() => setActivePin(null)}>×</button>
                  </div>
                  <div className="mapa-popup__body">
                    <p className="mapa-popup__type">{activePin.place_type?.toUpperCase()}&nbsp;&nbsp;{activePin.is_fictional ? '◇ FICTICIO' : '◆ REAL'}</p>
                    {activePin.book && (
                      <p className="mapa-popup__book">
                        <span className="mapa-popup__book-title">{activePin.book.title}</span>
                        {' — '}<em className="mapa-popup__book-author">{activePin.book.author}</em>
                        &nbsp;
                        <Link to={`/libro/${activePin.book.id}`} className="mapa-popup__book-link">Ver libro</Link>
                      </p>
                    )}
                    {activePin.note && <p className="mapa-popup__note">{activePin.note}</p>}
                  </div>
                  <div className="mapa-popup__footer">
                    <button className="mapa-popup__action" onClick={handleEditClick}>EDITAR</button>
                    <button className="mapa-popup__action mapa-popup__action--danger" onClick={() => setPopupMode('confirm-delete')}>ELIMINAR</button>
                  </div>
                </>
              )}

              {popupMode === 'edit' && (
                <>
                  <div className="mapa-popup__header">
                    <span className="mapa-popup__header-title">EDITAR LUGAR</span>
                    <button className="mapa-popup__close" onClick={() => setPopupMode('view')}>×</button>
                  </div>
                  <div className="mapa-popup__body">
                    <div className="mapa-form__group">
                      <label className="mapa-form__label">Nombre *</label>
                      <input
                        className="mapa-form__input"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        autoFocus
                      />
                    </div>
                    <div className="mapa-form__row">
                      <div className="mapa-form__group">
                        <label className="mapa-form__label">Tipo</label>
                        <select
                          className="mapa-form__select"
                          value={form.place_type}
                          onChange={e => setForm(f => ({ ...f, place_type: e.target.value }))}
                        >
                          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="mapa-form__group">
                        <label className="mapa-form__label">Origen</label>
                        <div className="mapa-toggle">
                          <button
                            className={`mapa-toggle__btn ${!form.is_fictional ? 'mapa-toggle__btn--active' : ''}`}
                            onClick={() => setForm(f => ({ ...f, is_fictional: false }))}
                          >Real</button>
                          <button
                            className={`mapa-toggle__btn ${form.is_fictional ? 'mapa-toggle__btn--active' : ''}`}
                            onClick={() => setForm(f => ({ ...f, is_fictional: true }))}
                          >Ficticio</button>
                        </div>
                      </div>
                    </div>
                    <div className="mapa-form__group">
                      <label className="mapa-form__label">Vincular a libro</label>
                      <select
                        className="mapa-form__select"
                        value={form.book_id}
                        onChange={e => setForm(f => ({ ...f, book_id: e.target.value }))}
                      >
                        <option value="">Sin libro</option>
                    {books.map(b => (
                          <option key={b.id} value={String(b.id)}>{b.titulo} — {b.autor}</option>
                        ))}
                      </select>
                    </div>
                    {form.book_id && (
                      <div className="mapa-form__group">
                        <label className="mapa-form__label">Color del libro</label>
                        <div className="mapa-form__color-row">
                            <input
                              type="color"
                              className="mapa-color-picker"
                              value={form.color}
                              onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                              title="Elegir color"
                            />
                          <input
                            className="mapa-form__color-hex"
                            value={form.color}
                            onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                            placeholder="#RRGGBB"
                            maxLength={7}
                          />
                        </div>
                      </div>
                    )}
                    <div className="mapa-form__group">
                      <label className="mapa-form__label">Nota</label>
                      <textarea
                        className="mapa-form__textarea"
                        value={form.note}
                        onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                        maxLength={300}
                        rows={3}
                      />
                    </div>
                    {formError && <p className="mapa-form__error">{formError}</p>}
                  </div>
                  <div className="mapa-popup__footer">
                    <button className="mapa-btn-save" onClick={handleSaveEdit}>GUARDAR ◆</button>
                    <button className="mapa-btn-cancel" onClick={() => setPopupMode('view')}>CANCELAR</button>
                  </div>
                </>
              )}

              {popupMode === 'confirm-delete' && (
                <>
                  <div className="mapa-popup__header">
                    <span className="mapa-popup__place-name">{activePin.name.toUpperCase()}</span>
                    <button className="mapa-popup__close" onClick={() => setActivePin(null)}>×</button>
                  </div>
                  <div className="mapa-popup__body">
                    <p className="mapa-popup__confirm-text">¿Eliminar este lugar?</p>
                  </div>
                  <div className="mapa-popup__footer">
                    <button className="mapa-popup__action mapa-popup__action--danger" onClick={handleDelete}>SÍ</button>
                    <button className="mapa-popup__action" onClick={() => setPopupMode('view')}>NO</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

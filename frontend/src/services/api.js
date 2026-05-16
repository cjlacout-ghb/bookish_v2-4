export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL}/api`;

async function handleResponse(res) {
  if (!res.ok) {
    let errorMsg = 'Error en la petición';
    try {
      const errData = await res.json();
      if (Array.isArray(errData.detail)) {
        // FastAPI validation errors
        errorMsg = errData.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
      } else {
        errorMsg = errData.detail || errorMsg;
      }
    } catch (e) {
      // Ignorar si no hay JSON
    }
    throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
  }
  if (res.status === 204) return null;
  return res.json();
}

export const API = {
  // ── Libros ────────────────────────────────────────────────────────────────
  getLibros: () => fetch(`${API_URL}/libros`).then(handleResponse),
  getLibro: (id) => fetch(`${API_URL}/libros/${id}`).then(handleResponse),
  crearLibro: (data) => fetch(`${API_URL}/libros`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  }).then(handleResponse),
  actualizarLibro: (id, data) => fetch(`${API_URL}/libros/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  }).then(handleResponse),
  eliminarLibro: (id) => fetch(`${API_URL}/libros/${id}`, { method: 'DELETE' }).then(handleResponse),
  subirPortada: (id, formData) => fetch(`${API_URL}/libros/${id}/portada`, {
    method: 'POST',
    body: formData
  }).then(handleResponse),

  // ── Notas ─────────────────────────────────────────────────────────────────
  getNotas: (libroId) => fetch(`${API_URL}/libros/${libroId}/notas`).then(handleResponse),
  crearNota: (libroId, data) => fetch(`${API_URL}/libros/${libroId}/notas`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  }).then(handleResponse),
  eliminarNota: (notaId) => fetch(`${API_URL}/notas/${notaId}`, { method: 'DELETE' }).then(handleResponse),

  // ── Sesiones (legacy) ─────────────────────────────────────────────────────
  getSesiones: (libroId) => fetch(`${API_URL}/libros/${libroId}/sesiones`).then(handleResponse),
  guardarSesion: (libroId, data) => fetch(`${API_URL}/libros/${libroId}/sesiones`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  }).then(handleResponse),

  // ── Timer control ─────────────────────────────────────────────────────────
  timerStart:  (libroId) => fetch(`${API_URL}/libros/${libroId}/timer/start`, { method: 'POST' }).then(handleResponse),
  timerPause:  (libroId) => fetch(`${API_URL}/libros/${libroId}/timer/pause`, { method: 'POST' }).then(handleResponse),
  timerResume: (libroId) => fetch(`${API_URL}/libros/${libroId}/timer/resume`, { method: 'POST' }).then(handleResponse),
  timerStop:   (libroId, note, file, paginaActual) => {
    const formData = new FormData();
    if (note) formData.append('session_note', note);
    if (file) formData.append('captura', file);
    if (paginaActual !== undefined && paginaActual !== null) formData.append('pagina_actual', paginaActual);
    
    return fetch(`${API_URL}/libros/${libroId}/timer/stop`, {
      method: 'POST',
      body: formData
    }).then(handleResponse);
  },

  // ── Active sessions ───────────────────────────────────────────────────────
  getSesionesActivas: () => fetch(`${API_URL}/sessions/active`).then(handleResponse),

  editarSesion: (id, iniciado_en, finalizado_en, session_note, file) => {
    const formData = new FormData();
    if (iniciado_en !== null) formData.append('iniciado_en', iniciado_en);
    if (finalizado_en !== null) formData.append('finalizado_en', finalizado_en);
    if (session_note !== null) formData.append('session_note', session_note); // If empty string, backend should clear it
    if (file) formData.append('captura', file);
    
    return fetch(`${API_URL}/sessions/${id}`, {
      method: 'PUT',
      body: formData
    }).then(handleResponse);
  },
  eliminarSesion: (id) => fetch(`${API_URL}/sessions/${id}`, { method: 'DELETE' }).then(handleResponse),

  // ── Reports ───────────────────────────────────────────────────────────────
  getReporteDia:  (date)           => fetch(`${API_URL}/reports/day?date=${date}`).then(handleResponse),
  getReporteMes:  (year, month)    => fetch(`${API_URL}/reports/month?year=${year}&month=${month}`).then(handleResponse),
  getReporteAnio: (year)           => fetch(`${API_URL}/reports/year?year=${year}`).then(handleResponse),

  // ── Estadísticas ──────────────────────────────────────────────────────────
  getEstadisticas: () => fetch(`${API_URL}/estadisticas`).then(handleResponse),

  // ── Inteligencia Visual stats ──────────────────────────────────────────────
  getStatsOverview:         ()     => fetch(`${API_URL}/stats/overview`).then(handleResponse),
  getStatsByGenre:          ()     => fetch(`${API_URL}/stats/by-genre`).then(handleResponse),
  getStatsByAuthor:         ()     => fetch(`${API_URL}/stats/by-author`).then(handleResponse),
  getStatsByPublisher:      ()     => fetch(`${API_URL}/stats/by-publisher`).then(handleResponse),
  getStatsRhythm:           (year) => fetch(`${API_URL}/stats/rhythm?year=${year}`).then(handleResponse),
  getStatsRatingsEvolution: ()     => fetch(`${API_URL}/stats/ratings-evolution`).then(handleResponse),

  // ── Reading Goals ──────────────────────────────────────────────────────────
  getGoal:          (year)         => fetch(`${API_URL}/goals/${year}`).then(handleResponse),
  upsertGoal:       (year, books)  => fetch(`${API_URL}/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, target_books: books }),
  }).then(handleResponse),
  getGoalProgress:  (year)         => fetch(`${API_URL}/goals/${year}/progress`).then(handleResponse),

  // ── Backup ────────────────────────────────────────────────────────────────
  importarBackup: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_URL}/backup/import`, {
      method: 'POST',
      body: formData
    }).then(handleResponse);
  },
  descargarBackup: () => {
    return fetch(`${API_URL}/backup/export`).then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error al descargar el backup");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bookish_backup.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    });
  },

  // ── Mapa ──────────────────────────────────────────────────────────────────
  getMapLocations: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/map/locations?${query}`).then(handleResponse);
  }
};

export const getFileURL = (filename) => {
  if (!filename) return null;
  const isElectron = /electron/i.test(navigator.userAgent);
  if (isElectron) return `app://covers/${filename}`;
  return `${BASE_URL}/covers/${filename}`;
};

export const getCapturaURL = (filename) => {
  if (!filename) return null;
  const isElectron = /electron/i.test(navigator.userAgent);
  if (isElectron) return `app://capturas/${filename}`;
  return `${BASE_URL}/capturas/${filename}`;
};

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: aggiunge Authorization header se token presente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: su 401 rimuove token e redirect a /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url?.includes('/auth/')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// --- CLIENTI ---
export const clientiApi = {
  lista: (search = '') => api.get('/clienti/', { params: { search } }),
  dettaglio: (id) => api.get(`/clienti/${id}`), 
  crea: (data) => api.post('/clienti/', data),
  aggiorna: (id, data) => api.put(`/clienti/${id}`, data), 
  elimina: (id) => api.delete(`/clienti/${id}`), 
  prezzi: (id) => api.get(`/clienti/${id}/prezzi`), 
};

// --- MULINI ---
export const muliniApi = {
  lista: (search = '') => api.get('/mulini/', { params: { search } }),
  dettaglio: (id) => api.get(`/mulini/${id}`), 
  prodotti: (id) => api.get(`/mulini/${id}/prodotti`), 
  crea: (data) => api.post('/mulini/', data),
  aggiorna: (id, data) => api.put(`/mulini/${id}`, data), 
  elimina: (id) => api.delete(`/mulini/${id}`), 
};

// --- PRODOTTI ---
export const prodottiApi = {
  lista: (params = {}) => api.get('/prodotti/', { params }),
  dettaglio: (id) => api.get(`/prodotti/${id}`), 
  crea: (data) => api.post('/prodotti/', data),
  aggiorna: (id, data) => api.put(`/prodotti/${id}`, data), 
  elimina: (id) => api.delete(`/prodotti/${id}`), 
};

// --- TRASPORTATORI ---
export const trasportatoriApi = {
  lista: (search = '') => api.get('/trasportatori/', { params: { search } }),
  dettaglio: (id) => api.get(`/trasportatori/${id}`), 
  crea: (data) => api.post('/trasportatori/', data),
  aggiorna: (id, data) => api.put(`/trasportatori/${id}`, data), 
  elimina: (id) => api.delete(`/trasportatori/${id}`), 
};

// --- ORDINI ---
export const ordiniApi = {
  lista: (params = {}) => api.get('/ordini/', { params }),
  dettaglio: (id) => api.get(`/ordini/${id}`), 
  crea: (data) => api.post('/ordini/', data),
  aggiorna: (id, data) => api.put(`/ordini/${id}`, data),
  elimina: (id) => api.delete(`/ordini/${id}`), 
  ultimoPrezzo: (clienteId, prodottoId) => 
    api.get(`/ordini/ultimo-prezzo/${clienteId}/${prodottoId}`), 
};

// --- CARICHI ---
export const carichiApi = {
  // Lista carichi con filtri opzionali
  lista: (params = {}) => api.get('/carichi/', { params }),
  
  // Lista carichi aperti (bozza + assegnato)
  aperti: () => api.get('/carichi/aperti'),
  
  // Lista carichi in bozza (per composizione)
  bozze: (params = {}) => api.get('/carichi/bozze', { params }),
  
  // Dettaglio singolo carico
  dettaglio: (id) => api.get(`/carichi/${id}`),
  
  // Ordini contenuti nel carico
  ordini: (id) => api.get(`/carichi/${id}/ordini`),
  
  // Ordini disponibili per essere aggiunti al carico
  ordiniDisponibili: (id) => api.get(`/carichi/${id}/ordini-disponibili`),
  
  // Crea nuovo carico (completo)
  crea: (data) => api.post('/carichi/', data),
  
  // Crea carico BOZZA da ordini (drag&drop)
  creaBozza: (data) => api.post('/carichi/bozza', data),
  
  // Aggiorna carico (note, trasportatore, data)
  aggiorna: (id, data) => api.put(`/carichi/${id}`, data),
  
  // Elimina carico
  elimina: (id) => api.delete(`/carichi/${id}`),
  
  // Assegna trasportatore e data (BOZZA -> ASSEGNATO)
  assegna: (id, data) => api.post(`/carichi/${id}/assegna`, data),
  
  // Aggiungi ordine a carico esistente
  aggiungiOrdine: (caricoId, ordineId) => 
    api.post(`/carichi/${caricoId}/ordini`, { ordine_id: ordineId }),
  
  // Rimuovi ordine da carico
  rimuoviOrdine: (caricoId, ordineId) => 
    api.delete(`/carichi/${caricoId}/ordini/${ordineId}`),
  
  // Segna come ritirato (ASSEGNATO -> RITIRATO)
  ritira: (id) => api.post(`/carichi/${id}/ritira`),
  
  // Segna come consegnato (RITIRATO -> CONSEGNATO)
  consegna: (id) => api.post(`/carichi/${id}/consegna`),
  
  // Valida ordini prima di creare carico
  valida: (ordiniIds) => api.post('/carichi/valida', ordiniIds),
};

// --- COMPOSIZIONE CARICHI ---
export const composizioneApi = {
  // Ottiene ordini disponibili raggruppati per mulino con suggerimenti
  ordiniDisponibili: (params = {}) =>
    api.get('/composizione-carichi/ordini-disponibili', { params }),
  
  // Lista mulini che hanno ordini da assegnare (per filtro)
  muliniConOrdini: () =>
    api.get('/composizione-carichi/mulini-con-ordini'),
};

// --- PAGAMENTI ---
export const pagamentiApi = {
  provvigioniTrimestre: (anno, trimestre) =>
    api.get('/pagamenti/provvigioni/trimestre', { params: { anno, trimestre } }),
  provvigioniOrdini: (anno, trimestre, mulino_id) =>
    api.get('/pagamenti/provvigioni/ordini', { 
      params: { anno, trimestre, mulino_id: mulino_id || undefined } 
    }),
  provvigioniDettaglioMulino: (mulinoId, anno, trimestre) =>
    api.get(`/pagamenti/provvigioni/dettaglio-mulino/${mulinoId}`, { 
      params: { anno, trimestre } 
    }),
  incassatoMulino: (mulinoId, params = {}) =>
    api.get(`/pagamenti/incassato-mulino/${mulinoId}`, { params }),
  vendutoPerCliente: (params = {}) =>
    api.get('/pagamenti/venduto-per-cliente/', { params }),
  vendutoPerProdotto: (params = {}) =>
    api.get('/pagamenti/venduto-per-prodotto/', { params }),
};

export default api;
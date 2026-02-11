import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  lista: (params = {}) => api.get('/carichi/', { params }),
  aperti: () => api.get('/carichi/aperti'), 
  dettaglio: (id) => api.get(`/carichi/${id}`), 
  crea: (data) => api.post('/carichi/', data),
  aggiorna: (id, data) => api.put(`/carichi/${id}`, data),
  elimina: (id) => api.delete(`/carichi/${id}`), 
  aggiungiOrdine: (caricoId, ordineId) => 
    api.post(`/carichi/${caricoId}/aggiungi-ordine/${ordineId}`), 
  rimuoviOrdine: (caricoId, ordineId) => 
    api.post(`/carichi/${caricoId}/rimuovi-ordine/${ordineId}`), 
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
    api.get('/pagamenti/provvigioni/ordini', { params: { anno, trimestre, mulino_id: mulino_id || undefined } }),
  provvigioniDettaglioMulino: (mulinoId, anno, trimestre) =>
    api.get(`/pagamenti/provvigioni/dettaglio-mulino/${mulinoId}`, { params: { anno, trimestre } }),
  incassatoMulino: (mulinoId, params = {}) =>
    api.get(`/pagamenti/incassato-mulino/${mulinoId}`, { params }),
  vendutoPerCliente: (params = {}) =>
    api.get('/pagamenti/venduto-per-cliente/', { params }),
  vendutoPerProdotto: (params = {}) =>
    api.get('/pagamenti/venduto-per-prodotto/', { params }),
};

export default api;

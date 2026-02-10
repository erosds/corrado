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
  dettaglio: (id) => api.get(`/clienti/${id}`), // Rimosso /
  crea: (data) => api.post('/clienti/', data),
  aggiorna: (id, data) => api.put(`/clienti/${id}`, data), // Rimosso /
  elimina: (id) => api.delete(`/clienti/${id}`), // Rimosso /
  prezzi: (id) => api.get(`/clienti/${id}/prezzi`), // Rimosso /
};

// --- MULINI ---
export const muliniApi = {
  lista: (search = '') => api.get('/mulini/', { params: { search } }),
  dettaglio: (id) => api.get(`/mulini/${id}`), // Rimosso /
  prodotti: (id) => api.get(`/mulini/${id}/prodotti`), // Rimosso /
  crea: (data) => api.post('/mulini/', data),
  aggiorna: (id, data) => api.put(`/mulini/${id}`, data), // Rimosso /
  elimina: (id) => api.delete(`/mulini/${id}`), // Rimosso /
};

// --- PRODOTTI ---
export const prodottiApi = {
  lista: (params = {}) => api.get('/prodotti/', { params }),
  dettaglio: (id) => api.get(`/prodotti/${id}`), // Rimosso /
  crea: (data) => api.post('/prodotti/', data),
  aggiorna: (id, data) => api.put(`/prodotti/${id}`, data), // Rimosso /
  elimina: (id) => api.delete(`/prodotti/${id}`), // Rimosso /
};

// --- TRASPORTATORI ---
export const trasportatoriApi = {
  lista: (search = '') => api.get('/trasportatori/', { params: { search } }),
  dettaglio: (id) => api.get(`/trasportatori/${id}`), // Rimosso /
  crea: (data) => api.post('/trasportatori/', data),
  aggiorna: (id, data) => api.put(`/trasportatori/${id}`, data), // Rimosso /
  elimina: (id) => api.delete(`/trasportatori/${id}`), // Rimosso /
};

// --- ORDINI ---
export const ordiniApi = {
  lista: (params = {}) => api.get('/ordini/', { params }),
  dettaglio: (id) => api.get(`/ordini/${id}`), // Rimosso /
  crea: (data) => api.post('/ordini/', data),
  aggiorna: (id, data) => api.put(`/ordini/${id}`), // Rimosso /
  elimina: (id) => api.delete(`/ordini/${id}`), // Rimosso /
  ultimoPrezzo: (clienteId, prodottoId) => 
    api.get(`/ordini/ultimo-prezzo/${clienteId}/${prodottoId}`), // Rimosso /
};

// --- CARICHI ---
export const carichiApi = {
  lista: (params = {}) => api.get('/carichi/', { params }),
  aperti: () => api.get('/carichi/aperti'), 
  dettaglio: (id) => api.get(`/carichi/${id}`), // Rimosso /
  crea: (data) => api.post('/carichi/', data),
  aggiorna: (id, data) => api.put(`/carichi/${id}`), // Rimosso /
  elimina: (id) => api.delete(`/carichi/${id}`), // Rimosso /
  aggiungiOrdine: (caricoId, ordineId) => 
    api.post(`/carichi/${caricoId}/aggiungi-ordine/${ordineId}`), // Rimosso /
  rimuoviOrdine: (caricoId, ordineId) => 
    api.post(`/carichi/${caricoId}/rimuovi-ordine/${ordineId}`), // Rimosso /
};

// --- STATISTICHE ---
export const statisticheApi = {
  provvigioniTrimestre: (anno, trimestre) => 
    api.get('/statistiche/provvigioni/trimestre', { params: { anno, trimestre } }),
  provvigioniDettaglioMulino: (mulinoId, anno, trimestre) => 
    api.get(`/statistiche/provvigioni/dettaglio-mulino/${mulinoId}`, { params: { anno, trimestre } }), // Rimosso /
  incassatoMulino: (mulinoId, params = {}) => 
    api.get(`/statistiche/incassato-mulino/${mulinoId}`, { params }), // Rimosso /
  vendutoPerCliente: (params = {}) => 
    api.get('/statistiche/venduto-per-cliente/', { params }),
  vendutoPerProdotto: (params = {}) => 
    api.get('/statistiche/venduto-per-prodotto/', { params }),
};

export default api;

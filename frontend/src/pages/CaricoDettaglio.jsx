import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Trash2, CheckCircle, Clock, Truck,
  Package, Plus, X, AlertCircle, Calendar
} from 'lucide-react';
import { carichiApi, ordiniApi } from '@/lib/api';

export default function CaricoDettaglio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [carico, setCarico] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAggiungiOrdine, setShowAggiungiOrdine] = useState(false);

  useEffect(() => {
    caricaDati();
  }, [id]);

  const caricaDati = async () => {
    try {
      setLoading(true);
      const { data } = await carichiApi.dettaglio(id);
      setCarico(data);
    } catch (error) {
      console.error('Errore caricamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCambiaStato = async (nuovoStato) => {
    const messaggio = nuovoStato === 'ritirato' 
      ? 'Segnare il carico come ritirato? Tutti gli ordini inclusi verranno aggiornati.'
      : 'Riportare il carico ad aperto?';
    
    if (!confirm(messaggio)) return;

    try {
      await carichiApi.aggiorna(id, { stato: nuovoStato });
      caricaDati();
    } catch (error) {
      console.error('Errore aggiornamento:', error);
      alert('Errore durante l\'aggiornamento');
    }
  };

  const handleRimuoviOrdine = async (ordineId) => {
    if (!confirm('Rimuovere questo ordine dal carico?')) return;

    try {
      await carichiApi.rimuoviOrdine(id, ordineId);
      caricaDati();
    } catch (error) {
      console.error('Errore rimozione ordine:', error);
      alert('Errore durante la rimozione');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Eliminare questo carico? Gli ordini verranno scollegati ma non eliminati.')) return;
    
    try {
      await carichiApi.elimina(id);
      navigate('/carichi');
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Impossibile eliminare il carico');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-32 bg-slate-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!carico) {
    return (
      <div className="p-4 md:p-8 text-center">
        <p className="text-slate-500">Carico non trovato</p>
        <Link to="/carichi" className="text-slate-900 underline mt-2 inline-block">
          Torna alla lista
        </Link>
      </div>
    );
  }

  const quintaliMancanti = 300 - parseFloat(carico.totale_quintali);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link 
            to="/carichi" 
            className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={16} />
            Carichi
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Carico #{carico.id}
            </h1>
            <span className={`px-3 py-1 text-sm font-bold rounded-full ${
              carico.stato === 'ritirato'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {carico.stato === 'ritirato' ? 'Ritirato' : 'Aperto'}
            </span>
          </div>
        </div>
        
        <button
          onClick={handleDelete}
          className="p-2.5 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Card Riepilogo Progresso */}
      <div className={`rounded-3xl p-6 mb-6 ${
        carico.is_completo 
          ? 'bg-gradient-to-br from-emerald-600 to-emerald-700' 
          : 'bg-gradient-to-br from-slate-900 to-slate-800'
      } text-white`}>
        <div className="flex items-center justify-between mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            carico.tipo_carico === 'pedane'
              ? 'bg-blue-500/20 text-blue-200'
              : 'bg-purple-500/20 text-purple-200'
          }`}>
            {carico.tipo_carico}
          </span>
          {carico.is_completo && (
            <span className="flex items-center gap-1 text-sm">
              <CheckCircle size={16} />
              Carico completo
            </span>
          )}
        </div>

        <div className="mb-4">
          <div className="flex items-end justify-between mb-2">
            <span className="text-4xl font-black">
              {parseFloat(carico.totale_quintali).toFixed(1)}
            </span>
            <span className="text-white/60">/ 300 quintali</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                carico.is_completo ? 'bg-white' : 'bg-white/80'
              }`}
              style={{ width: `${Math.min(100, carico.percentuale_completamento)}%` }}
            />
          </div>
        </div>

        {!carico.is_completo && quintaliMancanti > 0 && (
          <div className="flex items-center gap-2 text-amber-300 text-sm">
            <AlertCircle size={16} />
            Mancano ancora {quintaliMancanti.toFixed(0)} quintali per completare
          </div>
        )}
      </div>

      {/* Info Carico */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">
          Dettagli
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              <Calendar size={16} />
              Data carico
            </span>
            <span className="font-medium">{formatDate(carico.data_carico)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              <Truck size={16} />
              Trasportatore
            </span>
            <span className="font-medium">{carico.trasportatore_nome || '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              <Package size={16} />
              Ordini
            </span>
            <span className="font-medium">{carico.ordini?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Note */}
      {carico.note && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">
            Note
          </h3>
          <p className="text-slate-700 whitespace-pre-wrap">{carico.note}</p>
        </div>
      )}

      {/* Ordini nel Carico */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold">Ordini ({carico.ordini?.length || 0})</h3>
          {carico.stato === 'aperto' && (
            <button
              onClick={() => setShowAggiungiOrdine(true)}
              className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <Plus size={16} />
              Aggiungi
            </button>
          )}
        </div>

        {!carico.ordini || carico.ordini.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Package size={32} className="mx-auto mb-2" />
            <p>Nessun ordine nel carico</p>
            {carico.stato === 'aperto' && (
              <button
                onClick={() => setShowAggiungiOrdine(true)}
                className="mt-2 text-slate-900 underline text-sm"
              >
                Aggiungi ordini
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {carico.ordini.map((ordine) => (
              <div key={ordine.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <Link to={`/ordini/${ordine.id}`} className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">{ordine.cliente_nome}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        ordine.stato === 'ritirato'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {ordine.stato}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{formatDate(ordine.data_ordine)}</span>
                      <span className="font-medium text-slate-900">
                        {parseFloat(ordine.totale_quintali).toFixed(1)} q
                      </span>
                      <span>€{parseFloat(ordine.totale_importo).toFixed(2)}</span>
                    </div>
                  </Link>
                  
                  {carico.stato === 'aperto' && (
                    <button
                      onClick={() => handleRimuoviOrdine(ordine.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Rimuovi dal carico"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Azioni */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">
          Azioni
        </h3>
        
        {carico.stato === 'aperto' ? (
          <button
            onClick={() => handleCambiaStato('ritirato')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle size={18} />
            Segna come Ritirato
          </button>
        ) : (
          <button
            onClick={() => handleCambiaStato('aperto')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
          >
            <Clock size={18} />
            Riporta ad Aperto
          </button>
        )}
      </div>

      {/* Modal Aggiungi Ordine */}
      {showAggiungiOrdine && (
        <ModalAggiungiOrdine
          caricoId={parseInt(id)}
          tipoCarico={carico.tipo_carico}
          ordiniEsistenti={carico.ordini?.map(o => o.id) || []}
          onClose={() => setShowAggiungiOrdine(false)}
          onAdded={() => {
            setShowAggiungiOrdine(false);
            caricaDati();
          }}
        />
      )}
    </div>
  );
}

// --- Modal Aggiungi Ordine ---
function ModalAggiungiOrdine({ caricoId, tipoCarico, ordiniEsistenti, onClose, onAdded }) {
  const [ordiniDisponibili, setOrdiniDisponibili] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    caricaOrdiniDisponibili();
  }, []);

  const caricaOrdiniDisponibili = async () => {
    try {
      setLoading(true);
      // Carica ordini non ancora assegnati a carichi
      const { data } = await ordiniApi.lista({ stato: 'inserito' });
      
      // Filtra: stesso tipo e non già nel carico
      const filtrati = data.filter(o => 
        o.tipo_ordine === tipoCarico && 
        !ordiniEsistenti.includes(o.id)
      );
      
      setOrdiniDisponibili(filtrati);
    } catch (error) {
      console.error('Errore caricamento ordini:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAggiungi = async (ordineId) => {
    try {
      setAdding(ordineId);
      await carichiApi.aggiungiOrdine(caricoId, ordineId);
      onAdded();
    } catch (error) {
      console.error('Errore aggiunta ordine:', error);
      alert(error.response?.data?.detail || 'Errore durante l\'aggiunta');
      setAdding(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
      <div className="bg-white w-full md:w-[500px] md:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Aggiungi Ordine</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-slate-500 mb-4">
            Ordini disponibili (tipo: {tipoCarico})
          </p>

          {loading ? (
            <div className="py-8 text-center text-slate-400">
              Caricamento...
            </div>
          ) : ordiniDisponibili.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Package size={32} className="mx-auto mb-2" />
              <p>Nessun ordine disponibile</p>
              <p className="text-xs mt-1">
                Gli ordini devono essere di tipo "{tipoCarico}" e non assegnati ad altri carichi
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {ordiniDisponibili.map((ordine) => (
                <div
                  key={ordine.id}
                  className="p-4 bg-slate-50 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold">{ordine.cliente_nome}</p>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span>{formatDate(ordine.data_ordine)}</span>
                      <span className="font-medium text-slate-900">
                        {parseFloat(ordine.totale_quintali).toFixed(1)} q
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAggiungi(ordine.id)}
                    disabled={adding === ordine.id}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-black disabled:opacity-50"
                  >
                    {adding === ordine.id ? '...' : 'Aggiungi'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
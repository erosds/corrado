import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, CheckCircle, Clock, 
  Calendar, Factory, Package, User, Truck 
} from 'lucide-react';
import { ordiniApi } from '@/lib/api';

export default function OrdineDettaglio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ordine, setOrdine] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    caricaOrdine();
  }, [id]);

  const caricaOrdine = async () => {
    try {
      setLoading(true);
      const { data } = await ordiniApi.dettaglio(id);
      setOrdine(data);
    } catch (error) {
      console.error('Errore caricamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCambiaStato = async (nuovoStato) => {
    try {
      await ordiniApi.aggiorna(id, { stato: nuovoStato });
      caricaOrdine();
    } catch (error) {
      console.error('Errore aggiornamento stato:', error);
      alert('Errore durante l\'aggiornamento');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) return;
    
    try {
      await ordiniApi.elimina(id);
      navigate('/ordini');
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Impossibile eliminare l\'ordine');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
      weekday: 'short',
      day: '2-digit', 
      month: 'long',
      year: 'numeric'
    });
  };

  const calcolaTotali = () => {
    if (!ordine?.righe) return { quintali: 0, importo: 0 };
    const quintali = ordine.righe.reduce((sum, r) => sum + parseFloat(r.quintali || 0), 0);
    const importo = ordine.righe.reduce((sum, r) => sum + parseFloat(r.prezzo_totale || 0), 0);
    return { quintali, importo };
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

  if (!ordine) {
    return (
      <div className="p-4 md:p-8 text-center">
        <p className="text-slate-500">Ordine non trovato</p>
        <Link to="/ordini" className="text-slate-900 underline mt-2 inline-block">
          Torna alla lista
        </Link>
      </div>
    );
  }

  const { quintali, importo } = calcolaTotali();

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link 
            to="/ordini" 
            className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={16} />
            Ordini
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Ordine #{ordine.id}
            </h1>
            <span className={`px-3 py-1 text-sm font-bold rounded-full ${
              ordine.stato === 'ritirato'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {ordine.stato === 'ritirato' ? 'Ritirato' : 'Inserito'}
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

      {/* Card Riepilogo */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <Link 
              to={`/clienti/${ordine.cliente_id}`}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <User size={16} />
              <span className="text-lg font-bold">{ordine.cliente_nome}</span>
            </Link>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            ordine.tipo_ordine === 'pedane'
              ? 'bg-blue-500/20 text-blue-300'
              : 'bg-purple-500/20 text-purple-300'
          }`}>
            {ordine.tipo_ordine}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-slate-400 text-sm">Totale Quintali</p>
            <p className="text-3xl font-black">{quintali.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Totale Importo</p>
            <p className="text-3xl font-black">€{importo.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Date */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">
          Date
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              <Calendar size={16} />
              Data ordine
            </span>
            <span className="font-medium">{formatDate(ordine.data_ordine)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              <Truck size={16} />
              Data ritiro
            </span>
            <span className="font-medium">{formatDate(ordine.data_ritiro)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              <CheckCircle size={16} />
              Data incasso mulino
            </span>
            <span className="font-medium">{formatDate(ordine.data_incasso_mulino)}</span>
          </div>
        </div>
      </div>

      {/* Trasportatore */}
      {ordine.trasportatore_nome && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">
            Trasportatore
          </h3>
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-slate-500" />
            <span className="font-medium">{ordine.trasportatore_nome}</span>
          </div>
        </div>
      )}

      {/* Righe Ordine */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold">Prodotti ({ordine.righe?.length || 0})</h3>
        </div>
        
        {ordine.righe && ordine.righe.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {ordine.righe.map((riga, idx) => (
              <div key={idx} className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold">{riga.prodotto_nome}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Factory size={14} />
                      {riga.mulino_nome}
                    </p>
                  </div>
                  <p className="font-bold text-lg">€{parseFloat(riga.prezzo_totale).toFixed(2)}</p>
                </div>
                
                <div className="flex gap-4 text-sm text-slate-600">
                  {riga.pedane && (
                    <span>{parseFloat(riga.pedane)} pedane</span>
                  )}
                  <span>{parseFloat(riga.quintali).toFixed(2)} q</span>
                  <span>@ €{parseFloat(riga.prezzo_quintale).toFixed(2)}/q</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400">
            <Package size={32} className="mx-auto mb-2" />
            <p>Nessun prodotto</p>
          </div>
        )}
      </div>

      {/* Note */}
      {ordine.note && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">
            Note
          </h3>
          <p className="text-slate-700 whitespace-pre-wrap">{ordine.note}</p>
        </div>
      )}

      {/* Azioni */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">
          Azioni
        </h3>
        
        {ordine.stato === 'inserito' ? (
          <button
            onClick={() => handleCambiaStato('ritirato')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle size={18} />
            Segna come Ritirato
          </button>
        ) : (
          <button
            onClick={() => handleCambiaStato('inserito')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
          >
            <Clock size={18} />
            Riporta a Inserito
          </button>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, Filter, Package, ChevronRight, 
  Calendar, CheckCircle, Clock 
} from 'lucide-react';
import { ordiniApi } from '@/lib/api';

export default function Ordini() {
  const [ordini, setOrdini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStato, setFiltroStato] = useState('');
  const [showFiltri, setShowFiltri] = useState(false);

  useEffect(() => {
    caricaOrdini();
  }, [filtroStato]);

  const caricaOrdini = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroStato) params.stato = filtroStato;
      
      const { data } = await ordiniApi.lista(params);
      setOrdini(data);
    } catch (error) {
      console.error('Errore caricamento ordini:', error);
    } finally {
      setLoading(false);
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

  const ordiniInseriti = ordini.filter(o => o.stato === 'inserito').length;
  const ordiniRitirati = ordini.filter(o => o.stato === 'ritirato').length;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Ordini</h1>
          <p className="text-slate-500 text-sm mt-1">
            {ordiniInseriti} in attesa · {ordiniRitirati} ritirati
          </p>
        </div>
        <Link
          to="/ordini/nuovo"
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-black transition-colors"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nuovo</span>
        </Link>
      </div>

      {/* Filtri rapidi */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setFiltroStato('')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors ${
            filtroStato === '' 
              ? 'bg-slate-900 text-white' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Tutti
        </button>
        <button
          onClick={() => setFiltroStato('inserito')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
            filtroStato === 'inserito' 
              ? 'bg-amber-500 text-white' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clock size={16} />
          In attesa
        </button>
        <button
          onClick={() => setFiltroStato('ritirato')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
            filtroStato === 'ritirato' 
              ? 'bg-emerald-500 text-white' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CheckCircle size={16} />
          Ritirati
        </button>
      </div>

      {/* Lista Ordini */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : ordini.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500">Nessun ordine trovato</p>
          <Link
            to="/ordini/nuovo"
            className="mt-4 inline-flex items-center gap-2 text-slate-900 underline"
          >
            <Plus size={16} />
            Crea il primo ordine
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {ordini.map((ordine) => (
            <Link
              key={ordine.id}
              to={`/ordini/${ordine.id}`}
              className="block bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Cliente e stato */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 truncate">
                      {ordine.cliente_nome}
                    </h3>
                    <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-bold rounded-full ${
                      ordine.stato === 'ritirato' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {ordine.stato === 'ritirato' ? 'Ritirato' : 'Inserito'}
                    </span>
                  </div>

                  {/* Info ordine */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(ordine.data_ordine)}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      ordine.tipo_ordine === 'pedane' 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'bg-purple-50 text-purple-700'
                    }`}>
                      {ordine.tipo_ordine}
                    </span>
                  </div>

                  {/* Totali */}
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm">
                      <span className="font-bold text-slate-900">
                        {parseFloat(ordine.totale_quintali || 0).toFixed(1)}
                      </span>
                      <span className="text-slate-400"> q</span>
                    </span>
                    <span className="text-sm">
                      <span className="font-bold text-slate-900">
                        €{parseFloat(ordine.totale_importo || 0).toFixed(2)}
                      </span>
                    </span>
                  </div>
                </div>

                <ChevronRight 
                  className="text-slate-300 group-hover:text-slate-500 transition-colors mt-2" 
                  size={20} 
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
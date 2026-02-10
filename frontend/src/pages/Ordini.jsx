import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Package, ChevronRight, Calendar, CheckCircle, 
  Clock, Trash2, Edit, ChevronUp, ChevronDown, Filter, X
} from 'lucide-react';
import { ordiniApi } from '@/lib/api';
import DateHeader from '@/components/DateHeader';

export default function Ordini() {
  const navigate = useNavigate();
  const [ordini, setOrdini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStato, setFiltroStato] = useState('');
  const [filtroTesto, setFiltroTesto] = useState('');
  const [showFiltri, setShowFiltri] = useState(false);
  const [ordinamento, setOrdinamento] = useState({ campo: 'data_ordine', direzione: 'desc' });
  const [eliminando, setEliminando] = useState(null);

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

  const handleElimina = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) return;
    
    setEliminando(id);
    try {
      await ordiniApi.elimina(id);
      setOrdini(ordini.filter(o => o.id !== id));
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Impossibile eliminare l\'ordine');
    } finally {
      setEliminando(null);
    }
  };

  const handleModifica = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/ordini/${id}/modifica`);
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value || 0);
  };

  // Ordinamento
  const handleOrdinamento = (campo) => {
    setOrdinamento(prev => ({
      campo,
      direzione: prev.campo === campo && prev.direzione === 'asc' ? 'desc' : 'asc'
    }));
  };

  const IconaOrdinamento = ({ campo }) => {
    if (ordinamento.campo !== campo) return null;
    return ordinamento.direzione === 'asc' 
      ? <ChevronUp size={14} className="inline ml-1" />
      : <ChevronDown size={14} className="inline ml-1" />;
  };

  // Filtra e ordina
  const ordiniFiltrati = ordini
    .filter(o => {
      if (!filtroTesto) return true;
      const testo = filtroTesto.toLowerCase();
      return (
        o.cliente_nome?.toLowerCase().includes(testo) ||
        o.id?.toString().includes(testo)
      );
    })
    .sort((a, b) => {
      const dir = ordinamento.direzione === 'asc' ? 1 : -1;
      const valA = a[ordinamento.campo];
      const valB = b[ordinamento.campo];
      
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      
      if (typeof valA === 'string') {
        return valA.localeCompare(valB) * dir;
      }
      return (valA - valB) * dir;
    });

  const ordiniInseriti = ordini.filter(o => o.stato === 'inserito').length;
  const ordiniRitirati = ordini.filter(o => o.stato === 'ritirato').length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Data */}
      <DateHeader />

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

      {/* Barra ricerca e filtri */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per cliente o ID..."
            value={filtroTesto}
            onChange={(e) => setFiltroTesto(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          />
          {filtroTesto && (
            <button
              onClick={() => setFiltroTesto('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFiltri(!showFiltri)}
          className={`px-4 py-3 border rounded-xl flex items-center gap-2 transition-colors ${
            showFiltri ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Filter size={18} />
        </button>
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
          Tutti ({ordini.length})
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
          In attesa ({ordiniInseriti})
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
          Ritirati ({ordiniRitirati})
        </button>
      </div>

      {/* Tabella Ordini */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : ordiniFiltrati.length === 0 ? (
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
        <>
          {/* Vista Desktop - Tabella */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th 
                      className="text-left px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleOrdinamento('id')}
                    >
                      ID <IconaOrdinamento campo="id" />
                    </th>
                    <th 
                      className="text-left px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleOrdinamento('cliente_nome')}
                    >
                      Cliente <IconaOrdinamento campo="cliente_nome" />
                    </th>
                    <th 
                      className="text-left px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleOrdinamento('data_ordine')}
                    >
                      Data Ordine <IconaOrdinamento campo="data_ordine" />
                    </th>
                    <th 
                      className="text-left px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleOrdinamento('data_ritiro')}
                    >
                      Data Ritiro <IconaOrdinamento campo="data_ritiro" />
                    </th>
                    <th 
                      className="text-left px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleOrdinamento('tipo_ordine')}
                    >
                      Tipo <IconaOrdinamento campo="tipo_ordine" />
                    </th>
                    <th 
                      className="text-right px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleOrdinamento('totale_quintali')}
                    >
                      Quintali <IconaOrdinamento campo="totale_quintali" />
                    </th>
                    <th 
                      className="text-right px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleOrdinamento('totale_importo')}
                    >
                      Importo <IconaOrdinamento campo="totale_importo" />
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">
                      Stato
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordiniFiltrati.map((ordine) => (
                    <tr 
                      key={ordine.id} 
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => navigate(`/ordini/${ordine.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-medium">#{ordine.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{ordine.cliente_nome}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(ordine.data_ordine)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(ordine.data_ritiro)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${
                          ordine.tipo_ordine === 'pedane' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {ordine.tipo_ordine}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {parseFloat(ordine.totale_quintali || 0).toFixed(1)} q
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatCurrency(ordine.totale_importo)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${
                          ordine.stato === 'ritirato' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {ordine.stato === 'ritirato' ? '✓ Ritirato' : 'In attesa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => handleModifica(ordine.id, e)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifica"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => handleElimina(ordine.id, e)}
                            disabled={eliminando === ordine.id}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Elimina"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista Mobile - Card */}
          <div className="md:hidden space-y-3">
            {ordiniFiltrati.map((ordine) => (
              <Link
                key={ordine.id}
                to={`/ordini/${ordine.id}`}
                className="block bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 truncate">
                        {ordine.cliente_nome}
                      </h3>
                      <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-bold rounded-full ${
                        ordine.stato === 'ritirato' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {ordine.stato === 'ritirato' ? '✓' : '●'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      #{ordine.id} · {ordine.tipo_ordine}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleElimina(ordine.id, e)}
                      disabled={eliminando === ordine.id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={20} className="text-slate-300" />
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {formatDate(ordine.data_ordine)}
                  </span>
                  {ordine.data_ritiro && (
                    <span>→ {formatDate(ordine.data_ritiro)}</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-sm text-slate-600">
                    {parseFloat(ordine.totale_quintali || 0).toFixed(1)} quintali
                  </span>
                  <span className="font-bold">
                    {formatCurrency(ordine.totale_importo)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
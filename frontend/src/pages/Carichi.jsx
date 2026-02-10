import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Truck, ChevronRight, Package, CheckCircle, AlertCircle, 
  Clock, X, ChevronUp, ChevronDown, Edit, Trash2, MapPin, Filter
} from 'lucide-react';
import { carichiApi, trasportatoriApi, ordiniApi } from '@/lib/api';
import DateHeader from '@/components/DateHeader';

// Costanti
const OBIETTIVO_QUINTALI = 300;
const SOGLIA_MINIMA = 280;

export default function Carichi() {
  const navigate = useNavigate();
  const [carichi, setCarichi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStato, setFiltroStato] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [ordinamento, setOrdinamento] = useState({ campo: 'creato_il', direzione: 'desc' });
  const [showForm, setShowForm] = useState(false);
  const [caricoModifica, setCaricoModifica] = useState(null);
  const [eliminando, setEliminando] = useState(null);

  useEffect(() => {
    caricaCarichi();
  }, [filtroStato, filtroTipo]);

  const caricaCarichi = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroStato) params.stato = filtroStato;
      if (filtroTipo) params.tipo_carico = filtroTipo;
      
      const { data } = await carichiApi.lista(params);
      setCarichi(data);
    } catch (error) {
      console.error('Errore caricamento carichi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleElimina = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Sei sicuro di voler eliminare questo carico?')) return;
    
    setEliminando(id);
    try {
      await carichiApi.elimina(id);
      setCarichi(carichi.filter(c => c.id !== id));
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Impossibile eliminare il carico');
    } finally {
      setEliminando(null);
    }
  };

  const handleModifica = (carico, e) => {
    e.preventDefault();
    e.stopPropagation();
    setCaricoModifica(carico);
    setShowForm(true);
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
  const carichiFiltrati = carichi.sort((a, b) => {
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

  const carichiAperti = carichi.filter(c => c.stato === 'aperto').length;
  const carichiRitirati = carichi.filter(c => c.stato === 'ritirato').length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Data */}
      <DateHeader />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Carichi</h1>
          <p className="text-slate-500 text-sm mt-1">
            {carichiAperti} aperti · {carichiRitirati} ritirati
          </p>
        </div>
        <button
          onClick={() => {
            setCaricoModifica(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-black transition-colors"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nuovo</span>
        </button>
      </div>

      {/* Filtri rapidi */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Filtro stato */}
        <button
          onClick={() => setFiltroStato('')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            filtroStato === '' 
              ? 'bg-slate-900 text-white' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Tutti ({carichi.length})
        </button>
        <button
          onClick={() => setFiltroStato('aperto')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
            filtroStato === 'aperto' 
              ? 'bg-amber-500 text-white' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clock size={16} />
          Aperti ({carichiAperti})
        </button>
        <button
          onClick={() => setFiltroStato('ritirato')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
            filtroStato === 'ritirato' 
              ? 'bg-emerald-500 text-white' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CheckCircle size={16} />
          Ritirati ({carichiRitirati})
        </button>
        
        {/* Separatore */}
        <div className="w-px bg-slate-200 mx-2 hidden sm:block" />
        
        {/* Filtro tipo */}
        <button
          onClick={() => setFiltroTipo(filtroTipo === 'pedane' ? '' : 'pedane')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            filtroTipo === 'pedane' 
              ? 'bg-blue-500 text-white' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Pedane
        </button>
        <button
          onClick={() => setFiltroTipo(filtroTipo === 'sfuso' ? '' : 'sfuso')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            filtroTipo === 'sfuso' 
              ? 'bg-purple-500 text-white' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Sfuso
        </button>
      </div>

      {/* Lista Carichi */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : carichiFiltrati.length === 0 ? (
        <div className="text-center py-12">
          <Truck className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500">Nessun carico trovato</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 text-slate-900 underline"
          >
            <Plus size={16} />
            Crea il primo carico
          </button>
        </div>
      ) : (
        <>
          {/* Vista Desktop - Tabella */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 overflow-hidden">
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
                    onClick={() => handleOrdinamento('tipo_carico')}
                  >
                    Tipo <IconaOrdinamento campo="tipo_carico" />
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                    onClick={() => handleOrdinamento('data_carico')}
                  >
                    Data <IconaOrdinamento campo="data_carico" />
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">
                    Trasportatore
                  </th>
                  <th 
                    className="text-center px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                    onClick={() => handleOrdinamento('totale_quintali')}
                  >
                    Quintali <IconaOrdinamento campo="totale_quintali" />
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">
                    Completamento
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
                {carichiFiltrati.map((carico) => {
                  const quintali = parseFloat(carico.totale_quintali || 0);
                  const percentuale = Math.min(100, (quintali / OBIETTIVO_QUINTALI) * 100);
                  const isCompleto = quintali >= SOGLIA_MINIMA;
                  const eccesso = quintali > OBIETTIVO_QUINTALI;
                  
                  return (
                    <tr 
                      key={carico.id} 
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => navigate(`/carichi/${carico.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-medium">#{carico.id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${
                          carico.tipo_carico === 'pedane' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {carico.tipo_carico}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(carico.data_carico)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {carico.trasportatore_nome || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${eccesso ? 'text-red-600' : ''}`}>
                          {quintali.toFixed(0)}q
                        </span>
                        <span className="text-slate-400">/{OBIETTIVO_QUINTALI}</span>
                        {eccesso && (
                          <span className="ml-1 text-xs text-red-600">
                            (+{(quintali - OBIETTIVO_QUINTALI).toFixed(0)})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              eccesso
                                ? 'bg-red-500'
                                : isCompleto
                                  ? 'bg-emerald-500'
                                  : percentuale >= 80
                                    ? 'bg-amber-500'
                                    : 'bg-slate-300'
                            }`}
                            style={{ width: `${Math.min(100, percentuale)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${
                          carico.stato === 'ritirato' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {carico.stato === 'ritirato' ? '✓ Ritirato' : 'Aperto'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => handleModifica(carico, e)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifica"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => handleElimina(carico.id, e)}
                            disabled={eliminando === carico.id}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Elimina"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Vista Mobile - Card */}
          <div className="md:hidden space-y-3">
            {carichiFiltrati.map((carico) => {
              const quintali = parseFloat(carico.totale_quintali || 0);
              const percentuale = Math.min(100, (quintali / OBIETTIVO_QUINTALI) * 100);
              const isCompleto = quintali >= SOGLIA_MINIMA;
              const eccesso = quintali > OBIETTIVO_QUINTALI;
              
              return (
                <Link
                  key={carico.id}
                  to={`/carichi/${carico.id}`}
                  className="block bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header carico */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                          carico.stato === 'ritirato'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {carico.stato === 'ritirato' ? '✓ Ritirato' : 'Aperto'}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          carico.tipo_carico === 'pedane'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {carico.tipo_carico}
                        </span>
                      </div>

                      {/* Quintali e barra */}
                      <div className="mb-2">
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className={`text-2xl font-black ${eccesso ? 'text-red-600' : ''}`}>
                            {quintali.toFixed(0)}
                          </span>
                          <span className="text-slate-400">/ {OBIETTIVO_QUINTALI} quintali</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              eccesso
                                ? 'bg-red-500'
                                : isCompleto
                                  ? 'bg-emerald-500'
                                  : percentuale >= 80
                                    ? 'bg-amber-500'
                                    : 'bg-slate-300'
                            }`}
                            style={{ width: `${Math.min(100, percentuale)}%` }}
                          />
                        </div>
                      </div>

                      {/* Info aggiuntive */}
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Package size={14} />
                          {carico.num_ordini || 0} ordini
                        </span>
                        {carico.trasportatore_nome && (
                          <span className="flex items-center gap-1">
                            <Truck size={14} />
                            {carico.trasportatore_nome}
                          </span>
                        )}
                      </div>

                      {/* Warning */}
                      {carico.stato === 'aperto' && eccesso && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle size={14} />
                          Superato limite di {(quintali - OBIETTIVO_QUINTALI).toFixed(0)} quintali
                        </div>
                      )}
                      {carico.stato === 'aperto' && !isCompleto && !eccesso && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                          <AlertCircle size={14} />
                          Mancano {(SOGLIA_MINIMA - quintali).toFixed(0)} quintali (min {SOGLIA_MINIMA})
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleModifica(carico, e)}
                        className="p-2 text-slate-400 hover:text-blue-600"
                      >
                        <Edit size={16} />
                      </button>
                      <ChevronRight 
                        className="text-slate-300 group-hover:text-slate-500" 
                        size={20} 
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Modal Form Carico */}
      {showForm && (
        <FormCarico
          carico={caricoModifica}
          onClose={() => {
            setShowForm(false);
            setCaricoModifica(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setCaricoModifica(null);
            caricaCarichi();
          }}
        />
      )}
    </div>
  );
}


// --- Form Carico (Modal) ---
function FormCarico({ carico, onClose, onSaved }) {
  const isModifica = !!carico;
  
  const [formData, setFormData] = useState({
    tipo_carico: carico?.tipo_carico || 'pedane',
    data_carico: carico?.data_carico || '',
    trasportatore_id: carico?.trasportatore_id || '',
    stato: carico?.stato || 'aperto',
    note: carico?.note || '',
  });
  const [trasportatori, setTrasportatori] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    caricaTrasportatori();
  }, []);

  const caricaTrasportatori = async () => {
    try {
      const { data } = await trasportatoriApi.lista();
      setTrasportatori(data);
    } catch (error) {
      console.error('Errore caricamento trasportatori:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const data = {
        ...formData,
        trasportatore_id: formData.trasportatore_id ? parseInt(formData.trasportatore_id) : null,
        data_carico: formData.data_carico || null,
      };
      
      if (isModifica) {
        await carichiApi.aggiorna(carico.id, data);
      } else {
        data.ordini_ids = [];
        await carichiApi.crea(data);
      }
      
      onSaved();
    } catch (error) {
      console.error('Errore salvataggio:', error);
      alert('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-base";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
      <div className="bg-white w-full md:w-[500px] md:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {isModifica ? 'Modifica Carico' : 'Nuovo Carico'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo Carico */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo carico *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo_carico: 'pedane' })}
                disabled={isModifica}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  formData.tipo_carico === 'pedane'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } ${isModifica ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Pedane
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo_carico: 'sfuso' })}
                disabled={isModifica}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  formData.tipo_carico === 'sfuso'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } ${isModifica ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Sfuso
              </button>
            </div>
            {isModifica && (
              <p className="mt-1 text-xs text-slate-500">
                Il tipo carico non può essere modificato
              </p>
            )}
          </div>

          {/* Data Carico */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Data carico
            </label>
            <input
              type="date"
              value={formData.data_carico}
              onChange={(e) => setFormData({ ...formData, data_carico: e.target.value })}
              className={inputClass}
            />
          </div>

          {/* Trasportatore */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Trasportatore
            </label>
            <select
              value={formData.trasportatore_id}
              onChange={(e) => setFormData({ ...formData, trasportatore_id: e.target.value })}
              className={inputClass}
            >
              <option value="">Nessuno</option>
              {trasportatori.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          {/* Stato (solo in modifica) */}
          {isModifica && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Stato
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, stato: 'aperto' })}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                    formData.stato === 'aperto'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Aperto
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, stato: 'ritirato' })}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                    formData.stato === 'ritirato'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ritirato
                </button>
              </div>
              {formData.stato === 'ritirato' && (
                <p className="mt-1 text-xs text-amber-600">
                  ⚠️ Tutti gli ordini del carico verranno segnati come ritirati
                </p>
              )}
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-black transition-colors disabled:bg-slate-300"
            >
              {saving ? 'Salvataggio...' : isModifica ? 'Salva Modifiche' : 'Crea Carico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
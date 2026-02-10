import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Truck, ChevronRight, Package, 
  CheckCircle, AlertCircle, Clock
} from 'lucide-react';
import { carichiApi } from '@/lib/api';

export default function Carichi() {
  const [carichi, setCarichi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStato, setFiltroStato] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    caricaCarichi();
  }, [filtroStato]);

  const caricaCarichi = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroStato) params.stato = filtroStato;
      
      const { data } = await carichiApi.lista(params);
      setCarichi(data);
    } catch (error) {
      console.error('Errore caricamento carichi:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: 'short'
    });
  };

  const carichiAperti = carichi.filter(c => c.stato === 'aperto').length;
  const carichiRitirati = carichi.filter(c => c.stato === 'ritirato').length;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Carichi</h1>
          <p className="text-slate-500 text-sm mt-1">
            {carichiAperti} aperti · {carichiRitirati} ritirati
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-black transition-colors"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nuovo</span>
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
          Tutti
        </button>
        <button
          onClick={() => setFiltroStato('aperto')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
            filtroStato === 'aperto' 
              ? 'bg-amber-500 text-white' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clock size={16} />
          Aperti
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
      ) : carichi.length === 0 ? (
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
        <div className="space-y-3">
          {carichi.map((carico) => (
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
                      {carico.stato === 'ritirato' ? 'Ritirato' : 'Aperto'}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      carico.tipo_carico === 'pedane'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-purple-50 text-purple-700'
                    }`}>
                      {carico.tipo_carico}
                    </span>
                    {carico.data_carico && (
                      <span className="text-xs text-slate-500">
                        {formatDate(carico.data_carico)}
                      </span>
                    )}
                  </div>

                  {/* Barra progresso */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-bold">
                        {parseFloat(carico.totale_quintali).toFixed(0)} q
                      </span>
                      <span className="text-slate-500">
                        / 300 q ({parseFloat(carico.percentuale_completamento).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          carico.is_completo 
                            ? 'bg-emerald-500' 
                            : parseFloat(carico.percentuale_completamento) >= 80
                              ? 'bg-amber-500'
                              : 'bg-slate-300'
                        }`}
                        style={{ width: `${Math.min(100, carico.percentuale_completamento)}%` }}
                      />
                    </div>
                  </div>

                  {/* Info aggiuntive */}
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Package size={14} />
                      {carico.num_ordini} ordini
                    </span>
                    {carico.trasportatore_nome && (
                      <span className="flex items-center gap-1">
                        <Truck size={14} />
                        {carico.trasportatore_nome}
                      </span>
                    )}
                  </div>

                  {/* Warning se non completo */}
                  {carico.stato === 'aperto' && !carico.is_completo && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle size={14} />
                      Mancano {(300 - parseFloat(carico.totale_quintali)).toFixed(0)} quintali
                    </div>
                  )}
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

      {/* Modal Nuovo Carico */}
      {showForm && (
        <FormCarico
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            caricaCarichi();
          }}
        />
      )}
    </div>
  );
}

// --- Form Carico (Modal) ---
function FormCarico({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    tipo_carico: 'pedane',
    data_carico: '',
    trasportatore_id: '',
    note: '',
  });
  const [trasportatori, setTrasportatori] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Carica trasportatori
    fetch('/api/trasportatori')
      .then(r => r.json())
      .then(data => setTrasportatori(data))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const data = {
        ...formData,
        trasportatore_id: formData.trasportatore_id ? parseInt(formData.trasportatore_id) : null,
        ordini_ids: [],
      };
      
      await carichiApi.crea(data);
      onSaved();
    } catch (error) {
      console.error('Errore salvataggio:', error);
      alert('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
      <div className="bg-white w-full md:w-[500px] md:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Nuovo Carico</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
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
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  formData.tipo_carico === 'pedane'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pedane
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo_carico: 'sfuso' })}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  formData.tipo_carico === 'sfuso'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sfuso
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Data carico
            </label>
            <input
              type="date"
              value={formData.data_carico}
              onChange={(e) => setFormData({ ...formData, data_carico: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Trasportatore
            </label>
            <select
              value={formData.trasportatore_id}
              onChange={(e) => setFormData({ ...formData, trasportatore_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="">Nessuno</option>
              {trasportatori.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </div>

          <p className="text-sm text-slate-500">
            ℹ️ Potrai aggiungere ordini al carico dopo averlo creato
          </p>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Crea Carico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
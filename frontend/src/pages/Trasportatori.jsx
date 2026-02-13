import { useState, useEffect } from 'react';
import { Search, Plus, Truck, Phone, Edit, Trash2, X } from 'lucide-react';
import { trasportatoriApi } from '@/lib/api';
import DateHeader from '@/components/DateHeader';

export default function Trasportatori() {
  const [trasportatori, setTrasportatori] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [trasportatoreEdit, setTrasportatoreEdit] = useState(null);

  useEffect(() => {
    caricaTrasportatori();
  }, [search]);

  const caricaTrasportatori = async () => {
    try {
      setLoading(true);
      const { data } = await trasportatoriApi.lista(search);
      setTrasportatori(data);
    } catch (error) {
      console.error('Errore caricamento trasportatori:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo trasportatore?')) return;

    try {
      await trasportatoriApi.elimina(id);
      caricaTrasportatori();
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Impossibile eliminare il trasportatore');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <DateHeader />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Trasportatori</h1>
          <p className="text-slate-500 text-sm mt-1">{trasportatori.length} trasportatori</p>
        </div>
        <button
          onClick={() => {
            setTrasportatoreEdit(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-black transition-colors"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nuovo</span>
        </button>
      </div>

      {/* Barra Ricerca */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Cerca trasportatore..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : trasportatori.length === 0 ? (
        <div className="text-center py-12">
          <Truck className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500">Nessun trasportatore trovato</p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-2 text-slate-900 underline text-sm"
            >
              Cancella ricerca
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop - Tabella */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Trasportatore</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Telefono</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Note</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trasportatori.map((trasportatore) => (
                  <tr key={trasportatore.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-xl flex-shrink-0">
                          <Truck size={18} className="text-slate-600" />
                        </div>
                        <p className="font-bold text-slate-900">{trasportatore.nome}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {trasportatore.telefono ? (
                        <a
                          href={`tel:${trasportatore.telefono}`}
                          className="text-sm text-slate-600 flex items-center gap-1.5 hover:text-slate-900"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={13} className="text-slate-400" />
                          {trasportatore.telefono}
                        </a>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {trasportatore.note ? (
                        <p className="text-sm text-slate-500 truncate max-w-[300px]">{trasportatore.note}</p>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setTrasportatoreEdit(trasportatore);
                            setShowForm(true);
                          }}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Modifica"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(trasportatore.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Elimina"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile - Card */}
          <div className="md:hidden space-y-3">
            {trasportatori.map((trasportatore) => (
              <div
                key={trasportatore.id}
                className="bg-white rounded-2xl p-4 border border-slate-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-xl">
                      <Truck size={20} className="text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">
                        {trasportatore.nome}
                      </h3>
                      {trasportatore.telefono && (
                        <a
                          href={`tel:${trasportatore.telefono}`}
                          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
                        >
                          <Phone size={13} className="text-slate-400" />
                          {trasportatore.telefono}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setTrasportatoreEdit(trasportatore);
                        setShowForm(true);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(trasportatore.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {trasportatore.note && (
                  <p className="mt-2 text-sm text-slate-500 pl-12">
                    {trasportatore.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal Form */}
      {showForm && (
        <FormTrasportatore
          trasportatore={trasportatoreEdit}
          onClose={() => {
            setShowForm(false);
            setTrasportatoreEdit(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setTrasportatoreEdit(null);
            caricaTrasportatori();
          }}
        />
      )}
    </div>
  );
}

// --- Form Trasportatore (Modal) ---
function FormTrasportatore({ trasportatore = null, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    nome: trasportatore?.nome || '',
    telefono: trasportatore?.telefono || '',
    note: trasportatore?.note || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    try {
      setSaving(true);
      if (trasportatore) {
        await trasportatoriApi.aggiorna(trasportatore.id, formData);
      } else {
        await trasportatoriApi.crea(formData);
      }
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
          <h2 className="text-lg font-bold">
            {trasportatore ? 'Modifica Trasportatore' : 'Nuovo Trasportatore'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="es. Trasporti Rossi SRL"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Telefono
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="333 1234567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
              placeholder="Note aggiuntive..."
            />
          </div>

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
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

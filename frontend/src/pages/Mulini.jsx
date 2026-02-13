import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Factory, Phone, Mail, MapPin, ChevronRight, X } from 'lucide-react';
import { muliniApi } from '@/lib/api';
import DateHeader from '@/components/DateHeader';

export default function Mulini() {
  const [mulini, setMulini] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    caricaMulini();
  }, [search]);

  const caricaMulini = async () => {
    try {
      setLoading(true);
      const { data } = await muliniApi.lista(search);
      setMulini(data);
    } catch (error) {
      console.error('Errore caricamento mulini:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <DateHeader />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Mulini</h1>
          <p className="text-slate-500 text-sm mt-1">{mulini.length} mulini totali</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
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
          placeholder="Cerca mulino..."
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
      ) : mulini.length === 0 ? (
        <div className="text-center py-12">
          <Factory className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500">Nessun mulino trovato</p>
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
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Mulino</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Indirizzo Ritiro</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Telefono</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Email</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mulini.map((mulino) => (
                  <tr
                    key={mulino.id}
                    onClick={() => window.location.href = `/mulini/${mulino.id}`}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-xl flex-shrink-0">
                          <Factory size={18} className="text-orange-600" />
                        </div>
                        <p className="font-bold text-slate-900">{mulino.nome}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {mulino.indirizzo_ritiro ? (
                        <p className="text-sm text-slate-600 flex items-center gap-1.5 truncate max-w-[250px]">
                          <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                          {mulino.indirizzo_ritiro}
                        </p>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {mulino.telefono ? (
                        <p className="text-sm text-slate-600 flex items-center gap-1.5">
                          <Phone size={13} className="text-slate-400" />
                          {mulino.telefono}
                        </p>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {mulino.email1 ? (
                        <div className="space-y-0.5">
                          <p className="text-sm text-slate-600 flex items-center gap-1.5 truncate max-w-[220px]">
                            <Mail size={13} className="text-slate-400 flex-shrink-0" />
                            {mulino.email1}
                          </p>
                          {mulino.email2 && (
                            <p className="text-xs text-slate-400 pl-5 truncate max-w-[220px]">{mulino.email2}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight size={18} className="text-slate-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile - Card */}
          <div className="md:hidden space-y-3">
            {mulini.map((mulino) => (
              <Link
                key={mulino.id}
                to={`/mulini/${mulino.id}`}
                className="block bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-xl">
                      <Factory size={20} className="text-orange-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">{mulino.nome}</h3>
                  </div>
                  <ChevronRight
                    className="text-slate-300 group-hover:text-slate-500 transition-colors"
                    size={20}
                  />
                </div>

                <div className="space-y-1 text-sm text-slate-500 pl-12">
                  {mulino.indirizzo_ritiro && (
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin size={13} className="text-slate-400" />
                      {mulino.indirizzo_ritiro}
                    </p>
                  )}
                  {mulino.telefono && (
                    <p className="flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400" />
                      {mulino.telefono}
                    </p>
                  )}
                  {mulino.email1 && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail size={13} className="text-slate-400" />
                      {mulino.email1}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Modal Nuovo Mulino */}
      {showForm && (
        <FormMulino
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            caricaMulini();
          }}
        />
      )}
    </div>
  );
}

// --- Form Mulino (Modal) ---
function FormMulino({ mulino = null, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    nome: mulino?.nome || '',
    indirizzo_ritiro: mulino?.indirizzo_ritiro || '',
    telefono: mulino?.telefono || '',
    email1: mulino?.email1 || '',
    email2: mulino?.email2 || '',
    email3: mulino?.email3 || '',
    note: mulino?.note || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    try {
      setSaving(true);
      if (mulino) {
        await muliniApi.aggiorna(mulino.id, formData);
      } else {
        await muliniApi.crea(formData);
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
            {mulino ? 'Modifica Mulino' : 'Nuovo Mulino'}
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
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Indirizzo ritiro
            </label>
            <textarea
              value={formData.indirizzo_ritiro}
              onChange={(e) => setFormData({ ...formData, indirizzo_ritiro: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email 1
            </label>
            <input
              type="email"
              value={formData.email1}
              onChange={(e) => setFormData({ ...formData, email1: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email 2
            </label>
            <input
              type="email"
              value={formData.email2}
              onChange={(e) => setFormData({ ...formData, email2: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email 3
            </label>
            <input
              type="email"
              value={formData.email3}
              onChange={(e) => setFormData({ ...formData, email3: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
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

export { FormMulino };

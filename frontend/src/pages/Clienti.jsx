import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, User, Phone, Mail, MapPin, ChevronRight, X } from 'lucide-react';
import { clientiApi } from '@/lib/api';
import DateHeader from '@/components/DateHeader';

export default function Clienti() {
  const [clienti, setClienti] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    caricaClienti();
  }, [search]);

  const caricaClienti = async () => {
    try {
      setLoading(true);
      const { data } = await clientiApi.lista(search);
      setClienti(data);
    } catch (error) {
      console.error('Errore caricamento clienti:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <DateHeader />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Clienti</h1>
          <p className="text-slate-500 text-sm mt-1">{clienti.length} clienti totali</p>
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
          placeholder="Cerca cliente..."
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
      ) : clienti.length === 0 ? (
        <div className="text-center py-12">
          <User className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500">Nessun cliente trovato</p>
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
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Cliente</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Contatti</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Indirizzo</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">Pedana</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">Pag.</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clienti.map((cliente) => (
                  <tr
                    key={cliente.id}
                    onClick={() => window.location.href = `/clienti/${cliente.id}`}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{cliente.nome}</p>
                        {cliente.riba && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                            RIBA
                          </span>
                        )}
                      </div>
                      {cliente.referente && (
                        <p className="text-xs text-slate-500 mt-0.5">Ref. {cliente.referente}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {cliente.cellulare && (
                          <p className="text-sm text-slate-600 flex items-center gap-1.5">
                            <Phone size={13} className="text-slate-400" />
                            {cliente.cellulare}
                          </p>
                        )}
                        {cliente.email && (
                          <p className="text-sm text-slate-600 flex items-center gap-1.5 truncate max-w-[220px]">
                            <Mail size={13} className="text-slate-400 flex-shrink-0" />
                            {cliente.email}
                          </p>
                        )}
                        {!cliente.cellulare && !cliente.email && (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cliente.indirizzo_consegna ? (
                        <p className="text-sm text-slate-600 flex items-center gap-1.5 truncate max-w-[250px]">
                          <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                          {cliente.indirizzo_consegna}
                        </p>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cliente.pedana_standard ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-700">
                          {cliente.pedana_standard}q
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cliente.riba ? (
                        <span className="inline-flex px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
                          RIBA
                        </span>
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
            {clienti.map((cliente) => (
              <Link
                key={cliente.id}
                to={`/clienti/${cliente.id}`}
                className="block bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate text-lg">
                      {cliente.nome}
                    </h3>
                    {cliente.riba && (
                      <span className="flex-shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                        RIBA
                      </span>
                    )}
                    {cliente.pedana_standard && (
                      <span className="flex-shrink-0 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                        {cliente.pedana_standard}q
                      </span>
                    )}
                  </div>
                  <ChevronRight
                    className="text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0"
                    size={20}
                  />
                </div>

                <div className="space-y-1 text-sm text-slate-500">
                  {cliente.referente && (
                    <p>Ref. {cliente.referente}</p>
                  )}
                  {cliente.cellulare && (
                    <p className="flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400" />
                      {cliente.cellulare}
                    </p>
                  )}
                  {cliente.email && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail size={13} className="text-slate-400" />
                      {cliente.email}
                    </p>
                  )}
                  {cliente.indirizzo_consegna && (
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin size={13} className="text-slate-400" />
                      {cliente.indirizzo_consegna}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Modal Nuovo Cliente */}
      {showForm && (
        <FormCliente
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            caricaClienti();
          }}
        />
      )}
    </div>
  );
}

// --- Form Cliente (Modal) ---
function FormCliente({ cliente = null, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    nome: cliente?.nome || '',
    partita_iva: cliente?.partita_iva || '',
    indirizzo_consegna: cliente?.indirizzo_consegna || '',
    telefono_fisso: cliente?.telefono_fisso || '',
    cellulare: cliente?.cellulare || '',
    email: cliente?.email || '',
    referente: cliente?.referente || '',
    pedana_standard: cliente?.pedana_standard || '',
    riba: cliente?.riba || false,
    note: cliente?.note || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    try {
      setSaving(true);
      if (cliente) {
        await clientiApi.aggiorna(cliente.id, formData);
      } else {
        await clientiApi.crea(formData);
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
            {cliente ? 'Modifica Cliente' : 'Nuovo Cliente'}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cellulare
              </label>
              <input
                type="tel"
                value={formData.cellulare}
                onChange={(e) => setFormData({ ...formData, cellulare: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Telefono fisso
              </label>
              <input
                type="tel"
                value={formData.telefono_fisso}
                onChange={(e) => setFormData({ ...formData, telefono_fisso: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Partita IVA
            </label>
            <input
              type="text"
              value={formData.partita_iva}
              onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Indirizzo consegna
            </label>
            <textarea
              value={formData.indirizzo_consegna}
              onChange={(e) => setFormData({ ...formData, indirizzo_consegna: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Referente
              </label>
              <input
                type="text"
                value={formData.referente}
                onChange={(e) => setFormData({ ...formData, referente: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Pedana standard
              </label>
              <select
                value={formData.pedana_standard}
                onChange={(e) => setFormData({ ...formData, pedana_standard: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              >
                <option value="">Seleziona...</option>
                <option value="8">8 quintali</option>
                <option value="10">10 quintali</option>
                <option value="12.5">12.5 quintali</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              id="riba"
              checked={formData.riba}
              onChange={(e) => setFormData({ ...formData, riba: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <label htmlFor="riba" className="text-sm font-medium text-slate-700">
              Pagamento RIBA (+60gg fine mese)
            </label>
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

export { FormCliente };

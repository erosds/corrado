import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, 
  Package, Plus, Factory, Percent, Euro
} from 'lucide-react';
import { muliniApi, prodottiApi } from '@/lib/api';
import { FormMulino } from './Mulini';

export default function MulinoDettaglio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mulino, setMulino] = useState(null);
  const [prodotti, setProdotti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showFormProdotto, setShowFormProdotto] = useState(false);
  const [prodottoEdit, setProdottoEdit] = useState(null);

  useEffect(() => {
    caricaDati();
  }, [id]);

  const caricaDati = async () => {
    try {
      setLoading(true);
      const [mulinoRes, prodottiRes] = await Promise.all([
        muliniApi.dettaglio(id),
        muliniApi.prodotti(id),
      ]);
      setMulino(mulinoRes.data);
      setProdotti(prodottiRes.data);
    } catch (error) {
      console.error('Errore caricamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo mulino?')) return;
    
    try {
      await muliniApi.elimina(id);
      navigate('/mulini');
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Impossibile eliminare il mulino. Potrebbe avere prodotti associati.');
    }
  };

  const handleDeleteProdotto = async (prodottoId) => {
    if (!confirm('Eliminare questo prodotto?')) return;
    
    try {
      await prodottiApi.elimina(prodottoId);
      caricaDati();
    } catch (error) {
      console.error('Errore eliminazione prodotto:', error);
      alert('Impossibile eliminare il prodotto');
    }
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

  if (!mulino) {
    return (
      <div className="p-4 md:p-8 text-center">
        <p className="text-slate-500">Mulino non trovato</p>
        <Link to="/mulini" className="text-slate-900 underline mt-2 inline-block">
          Torna alla lista
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link 
            to="/mulini" 
            className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={16} />
            Mulini
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-2xl">
              <Factory size={28} className="text-orange-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              {mulino.nome}
            </h1>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2.5 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Contatti */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">
          Contatti
        </h3>
        <div className="space-y-3">
          {mulino.telefono && (
            <a 
              href={`tel:${mulino.telefono}`}
              className="flex items-center gap-3 text-slate-700 hover:text-slate-900"
            >
              <Phone size={18} className="text-slate-400" />
              <span>{mulino.telefono}</span>
            </a>
          )}
          {mulino.email1 && (
            <a 
              href={`mailto:${mulino.email1}`}
              className="flex items-center gap-3 text-slate-700 hover:text-slate-900"
            >
              <Mail size={18} className="text-slate-400" />
              <span>{mulino.email1}</span>
            </a>
          )}
          {mulino.email2 && (
            <a 
              href={`mailto:${mulino.email2}`}
              className="flex items-center gap-3 text-slate-700 hover:text-slate-900"
            >
              <Mail size={18} className="text-slate-400" />
              <span>{mulino.email2}</span>
            </a>
          )}
          {mulino.email3 && (
            <a 
              href={`mailto:${mulino.email3}`}
              className="flex items-center gap-3 text-slate-700 hover:text-slate-900"
            >
              <Mail size={18} className="text-slate-400" />
              <span>{mulino.email3}</span>
            </a>
          )}
          {mulino.indirizzo_ritiro && (
            <div className="flex items-start gap-3 text-slate-700">
              <MapPin size={18} className="text-slate-400 mt-0.5" />
              <span>{mulino.indirizzo_ritiro}</span>
            </div>
          )}
        </div>
      </div>

      {/* Note */}
      {mulino.note && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">
            Note
          </h3>
          <p className="text-slate-700 whitespace-pre-wrap">{mulino.note}</p>
        </div>
      )}

      {/* Prodotti */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold">Prodotti ({prodotti.length})</h3>
          <button
            onClick={() => {
              setProdottoEdit(null);
              setShowFormProdotto(true);
            }}
            className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <Plus size={16} />
            Aggiungi
          </button>
        </div>

        {prodotti.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Package size={32} className="mx-auto mb-2" />
            <p>Nessun prodotto</p>
            <button
              onClick={() => {
                setProdottoEdit(null);
                setShowFormProdotto(true);
              }}
              className="mt-2 text-slate-900 underline text-sm"
            >
              Aggiungi il primo prodotto
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {prodotti.map((prodotto) => (
              <div key={prodotto.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold">{prodotto.nome}</h4>
                      {prodotto.tipologia && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                          Tipo {prodotto.tipologia}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                      {prodotto.tipo_provvigione === 'percentuale' ? (
                        <span className="flex items-center gap-1">
                          <Percent size={14} />
                          {prodotto.valore_provvigione}%
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Euro size={14} />
                          {prodotto.valore_provvigione}/q
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setProdottoEdit(prodotto);
                        setShowFormProdotto(true);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteProdotto(prodotto.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Edit Mulino */}
      {showEdit && (
        <FormMulino
          mulino={mulino}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            caricaDati();
          }}
        />
      )}

      {/* Modal Prodotto */}
      {showFormProdotto && (
        <FormProdotto
          prodotto={prodottoEdit}
          mulinoId={parseInt(id)}
          onClose={() => {
            setShowFormProdotto(false);
            setProdottoEdit(null);
          }}
          onSaved={() => {
            setShowFormProdotto(false);
            setProdottoEdit(null);
            caricaDati();
          }}
        />
      )}
    </div>
  );
}

// --- Form Prodotto (Modal) ---
function FormProdotto({ prodotto = null, mulinoId, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    nome: prodotto?.nome || '',
    mulino_id: mulinoId,
    tipologia: prodotto?.tipologia || '',
    tipo_provvigione: prodotto?.tipo_provvigione || 'percentuale',
    valore_provvigione: prodotto?.valore_provvigione || '3',
    note: prodotto?.note || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    try {
      setSaving(true);
      const data = {
        ...formData,
        valore_provvigione: parseFloat(formData.valore_provvigione),
      };
      
      if (prodotto) {
        await prodottiApi.aggiorna(prodotto.id, data);
      } else {
        await prodottiApi.crea(data);
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
            {prodotto ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
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
              Nome prodotto *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="es. Farina 00 Manitoba"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipologia
            </label>
            <select
              value={formData.tipologia}
              onChange={(e) => setFormData({ ...formData, tipologia: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="">Nessuna</option>
              <option value="0">Tipo 0</option>
              <option value="00">Tipo 00</option>
              <option value="altro">Altro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo provvigione
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo_provvigione: 'percentuale' })}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                  formData.tipo_provvigione === 'percentuale'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Percent size={16} />
                Percentuale
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo_provvigione: 'fisso' })}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                  formData.tipo_provvigione === 'fisso'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Euro size={16} />
                Fisso €/q
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Valore provvigione {formData.tipo_provvigione === 'percentuale' ? '(%)' : '(€/quintale)'}
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.valore_provvigione}
              onChange={(e) => setFormData({ ...formData, valore_provvigione: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder={formData.tipo_provvigione === 'percentuale' ? '3' : '1'}
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
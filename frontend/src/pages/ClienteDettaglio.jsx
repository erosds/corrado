import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Phone, Mail, MapPin, CreditCard, Edit, Trash2, 
  Package, ChevronRight, Factory, ArrowLeft 
} from 'lucide-react';
import { clientiApi } from '@/lib/api';
import { FormCliente } from './Clienti';

export default function ClienteDettaglio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [prezzi, setPrezzi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [tab, setTab] = useState('info'); // 'info' | 'prezzi'

  useEffect(() => {
    caricaDati();
  }, [id]);

  const caricaDati = async () => {
    try {
      setLoading(true);
      const [clienteRes, prezziRes] = await Promise.all([
        clientiApi.dettaglio(id),
        clientiApi.prezzi(id),
      ]);
      setCliente(clienteRes.data);
      setPrezzi(prezziRes.data);
    } catch (error) {
      console.error('Errore caricamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo cliente?')) return;
    
    try {
      await clientiApi.elimina(id);
      navigate('/clienti');
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Impossibile eliminare il cliente');
    }
  };

  // Raggruppa prezzi per mulino
  const prezziPerMulino = prezzi.reduce((acc, p) => {
    if (!acc[p.mulino_nome]) {
      acc[p.mulino_nome] = [];
    }
    acc[p.mulino_nome].push(p);
    return acc;
  }, {});

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

  if (!cliente) {
    return (
      <div className="p-4 md:p-8 text-center">
        <p className="text-slate-500">Cliente non trovato</p>
        <Link to="/clienti" className="text-slate-900 underline mt-2 inline-block">
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
            to="/clienti" 
            className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={16} />
            Clienti
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              {cliente.nome}
            </h1>
            {cliente.riba && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded-full">
                RIBA
              </span>
            )}
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('info')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            tab === 'info' 
              ? 'bg-slate-900 text-white' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Informazioni
        </button>
        <button
          onClick={() => setTab('prezzi')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            tab === 'prezzi' 
              ? 'bg-slate-900 text-white' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Prezzi ({prezzi.length})
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'info' ? (
        <div className="space-y-4">
          {/* Contatti */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">
              Contatti
            </h3>
            <div className="space-y-3">
              {cliente.cellulare && (
                <a 
                  href={`tel:${cliente.cellulare}`}
                  className="flex items-center gap-3 text-slate-700 hover:text-slate-900"
                >
                  <Phone size={18} className="text-slate-400" />
                  <span>{cliente.cellulare}</span>
                </a>
              )}
              {cliente.telefono_fisso && (
                <a 
                  href={`tel:${cliente.telefono_fisso}`}
                  className="flex items-center gap-3 text-slate-700 hover:text-slate-900"
                >
                  <Phone size={18} className="text-slate-400" />
                  <span>{cliente.telefono_fisso}</span>
                </a>
              )}
              {cliente.email && (
                <a 
                  href={`mailto:${cliente.email}`}
                  className="flex items-center gap-3 text-slate-700 hover:text-slate-900"
                >
                  <Mail size={18} className="text-slate-400" />
                  <span>{cliente.email}</span>
                </a>
              )}
              {cliente.indirizzo_consegna && (
                <div className="flex items-start gap-3 text-slate-700">
                  <MapPin size={18} className="text-slate-400 mt-0.5" />
                  <span>{cliente.indirizzo_consegna}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dettagli */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">
              Dettagli
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {cliente.partita_iva && (
                <div>
                  <p className="text-sm text-slate-500">Partita IVA</p>
                  <p className="font-medium">{cliente.partita_iva}</p>
                </div>
              )}
              {cliente.referente && (
                <div>
                  <p className="text-sm text-slate-500">Referente</p>
                  <p className="font-medium">{cliente.referente}</p>
                </div>
              )}
              {cliente.pedana_standard && (
                <div>
                  <p className="text-sm text-slate-500">Pedana standard</p>
                  <p className="font-medium">{cliente.pedana_standard} quintali</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-500">Pagamento</p>
                <p className="font-medium">
                  {cliente.riba ? 'RIBA 60gg FM' : 'Standard'}
                </p>
              </div>
            </div>
          </div>

          {/* Note */}
          {cliente.note && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">
                Note
              </h3>
              <p className="text-slate-700 whitespace-pre-wrap">{cliente.note}</p>
            </div>
          )}

          {/* Azioni rapide */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">
              Azioni
            </h3>
            <Link
              to={`/ordini/nuovo?cliente=${id}`}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package size={20} className="text-slate-600" />
                <span className="font-medium">Nuovo ordine</span>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </Link>
          </div>
        </div>
      ) : (
        /* Tab Prezzi */
        <div className="space-y-6">
          {Object.keys(prezziPerMulino).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
              <Package className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">Nessun prezzo registrato</p>
              <p className="text-sm text-slate-400 mt-1">
                I prezzi verranno salvati automaticamente con gli ordini
              </p>
            </div>
          ) : (
            Object.entries(prezziPerMulino).map(([mulino, prodotti]) => (
              <div key={mulino} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="bg-slate-50 px-5 py-3 flex items-center gap-2">
                  <Factory size={18} className="text-slate-500" />
                  <h3 className="font-bold">{mulino}</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {prodotti.map((p, idx) => (
                    <div key={idx} className="px-5 py-3 flex items-center justify-between">
                      <span className="text-slate-700">{p.prodotto_nome}</span>
                      <span className="font-bold text-lg">
                        €{parseFloat(p.ultimo_prezzo).toFixed(2)}
                        <span className="text-sm font-normal text-slate-400">/q</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Edit */}
      {showEdit && (
        <FormCliente
          cliente={cliente}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            caricaDati();
          }}
        />
      )}
    </div>
  );
}
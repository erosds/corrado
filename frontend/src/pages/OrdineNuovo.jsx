import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Trash2, Factory, Package, 
  Calculator, ChevronDown, ChevronUp 
} from 'lucide-react';
import { clientiApi, muliniApi, ordiniApi } from '@/lib/api';

export default function OrdineNuovo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteIdParam = searchParams.get('cliente');

  const [clienti, setClienti] = useState([]);
  const [mulini, setMulini] = useState([]);
  const [trasportatori, setTrasportatori] = useState([]);
  const [prodottiPerMulino, setProdottiPerMulino] = useState({});
  
  const [formData, setFormData] = useState({
    cliente_id: clienteIdParam || '',
    data_ordine: new Date().toISOString().split('T')[0],
    data_ritiro: '',
    tipo_ordine: 'pedane',
    trasportatore_id: '',
    note: '',
  });
  
  const [righe, setRighe] = useState([]);
  const [mulinoSelezionato, setMulinoSelezionato] = useState('');
  const [clienteSelezionato, setClienteSelezionato] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    caricaDatiIniziali();
  }, []);

  useEffect(() => {
    if (formData.cliente_id) {
      const cliente = clienti.find(c => c.id === parseInt(formData.cliente_id));
      setClienteSelezionato(cliente);
    }
  }, [formData.cliente_id, clienti]);

  const caricaDatiIniziali = async () => {
    try {
      const [clientiRes, muliniRes, traspRes] = await Promise.all([
        clientiApi.lista(),
        muliniApi.lista(),
        fetch('/api/trasportatori/').then(r => r.json()),
      ]);
      setClienti(clientiRes.data);
      setMulini(muliniRes.data);
      setTrasportatori(traspRes);
    } catch (error) {
      console.error('Errore caricamento dati:', error);
    }
  };

  const caricaProdottiMulino = async (mulinoId) => {
    if (prodottiPerMulino[mulinoId]) return;
    
    try {
      const { data } = await muliniApi.prodotti(mulinoId);
      setProdottiPerMulino(prev => ({ ...prev, [mulinoId]: data }));
    } catch (error) {
      console.error('Errore caricamento prodotti:', error);
    }
  };

  const handleMulinoChange = async (mulinoId) => {
    setMulinoSelezionato(mulinoId);
    if (mulinoId) {
      await caricaProdottiMulino(mulinoId);
    }
  };

  const aggiungiRiga = async (prodotto) => {
    const mulino = mulini.find(m => m.id === prodotto.mulino_id);
    
    // Cerca ultimo prezzo
    let ultimoPrezzo = '';
    if (formData.cliente_id) {
      try {
        const { data } = await ordiniApi.ultimoPrezzo(formData.cliente_id, prodotto.id);
        if (data.prezzo) {
          ultimoPrezzo = data.prezzo;
        }
      } catch (e) {
        // Nessun prezzo precedente
      }
    }

    const nuovaRiga = {
      id: Date.now(), // ID temporaneo per React key
      prodotto_id: prodotto.id,
      prodotto_nome: prodotto.nome,
      mulino_id: prodotto.mulino_id,
      mulino_nome: mulino?.nome || '',
      pedane: '',
      quintali: '',
      prezzo_quintale: ultimoPrezzo,
      prezzo_totale: 0,
    };

    setRighe([...righe, nuovaRiga]);
    setMulinoSelezionato('');
  };

  const aggiornaRiga = (rigaId, campo, valore) => {
    setRighe(righe.map(riga => {
      if (riga.id !== rigaId) return riga;

      const nuovaRiga = { ...riga, [campo]: valore };

      // Calcola quintali da pedane se necessario
      if (campo === 'pedane' && formData.tipo_ordine === 'pedane' && clienteSelezionato?.pedana_standard) {
        const pedane = parseFloat(valore) || 0;
        const qtPedana = parseFloat(clienteSelezionato.pedana_standard) || 0;
        nuovaRiga.quintali = (pedane * qtPedana).toFixed(2);
      }

      // Ricalcola totale
      const quintali = parseFloat(nuovaRiga.quintali) || 0;
      const prezzo = parseFloat(nuovaRiga.prezzo_quintale) || 0;
      nuovaRiga.prezzo_totale = (quintali * prezzo).toFixed(2);

      return nuovaRiga;
    }));
  };

  const rimuoviRiga = (rigaId) => {
    setRighe(righe.filter(r => r.id !== rigaId));
  };

  const calcolaTotali = () => {
    const totaleQuintali = righe.reduce((sum, r) => sum + (parseFloat(r.quintali) || 0), 0);
    const totaleImporto = righe.reduce((sum, r) => sum + (parseFloat(r.prezzo_totale) || 0), 0);
    return { totaleQuintali, totaleImporto };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cliente_id) {
      alert('Seleziona un cliente');
      return;
    }
    if (righe.length === 0) {
      alert('Aggiungi almeno un prodotto');
      return;
    }

    try {
      setSaving(true);
      
      const ordineData = {
        ...formData,
        cliente_id: parseInt(formData.cliente_id),
        trasportatore_id: formData.trasportatore_id ? parseInt(formData.trasportatore_id) : null,
        righe: righe.map(r => ({
          prodotto_id: r.prodotto_id,
          mulino_id: r.mulino_id,
          pedane: r.pedane ? parseFloat(r.pedane) : null,
          quintali: parseFloat(r.quintali),
          prezzo_quintale: parseFloat(r.prezzo_quintale),
          prezzo_totale: parseFloat(r.prezzo_totale),
        })),
      };

      const { data } = await ordiniApi.crea(ordineData);
      navigate(`/ordini/${data.id}`);
    } catch (error) {
      console.error('Errore creazione ordine:', error);
      alert('Errore durante la creazione dell\'ordine');
    } finally {
      setSaving(false);
    }
  };

  const { totaleQuintali, totaleImporto } = calcolaTotali();

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">
          Nuovo Ordine
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Sezione Cliente e Date */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="font-bold">Dati Ordine</h3>
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {expanded && (
            <div className="mt-4 space-y-4">
              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cliente *
                </label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  required
                >
                  <option value="">Seleziona cliente...</option>
                  {clienti.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                {clienteSelezionato?.riba && (
                  <p className="mt-1 text-sm text-blue-600">
                    ⓘ Cliente RIBA - data incasso calcolata automaticamente
                  </p>
                )}
                {clienteSelezionato?.pedana_standard && formData.tipo_ordine === 'pedane' && (
                  <p className="mt-1 text-sm text-emerald-600">
                    ⓘ Pedana standard: {clienteSelezionato.pedana_standard} quintali — i quintali verranno calcolati automaticamente
                  </p>
                )}
              </div>

              {/* Date e Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data ordine *
                  </label>
                  <input
                    type="date"
                    value={formData.data_ordine}
                    onChange={(e) => setFormData({ ...formData, data_ordine: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data ritiro
                  </label>
                  <input
                    type="date"
                    value={formData.data_ritiro}
                    onChange={(e) => setFormData({ ...formData, data_ritiro: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Tipo Ordine */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo ordine *
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_ordine: 'pedane' })}
                    className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                      formData.tipo_ordine === 'pedane'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Pedane
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_ordine: 'sfuso' })}
                    className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                      formData.tipo_ordine === 'sfuso'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Sfuso
                  </button>
                </div>
              </div>

              {/* Trasportatore */}
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

              {/* Note */}
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
            </div>
          )}
        </div>

        {/* Sezione Prodotti */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <h3 className="font-bold mb-4">Prodotti</h3>

          {/* Aggiungi prodotto */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Aggiungi da mulino
            </label>
            <select
              value={mulinoSelezionato}
              onChange={(e) => handleMulinoChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="">Seleziona mulino...</option>
              {mulini.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>

            {/* Lista prodotti del mulino */}
            {mulinoSelezionato && prodottiPerMulino[mulinoSelezionato] && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {prodottiPerMulino[mulinoSelezionato].map(prod => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => aggiungiRiga(prod)}
                    className="p-3 text-left bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <p className="font-medium text-sm truncate">{prod.nome}</p>
                    {prod.tipologia && (
                      <p className="text-xs text-slate-500">Tipo {prod.tipologia}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Righe ordine */}
          {righe.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Package size={32} className="mx-auto mb-2" />
              <p className="text-sm">Seleziona un mulino per aggiungere prodotti</p>
            </div>
          ) : (
            <div className="space-y-3">
              {righe.map((riga) => (
                <div
                  key={riga.id}
                  className="p-4 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold">{riga.prodotto_nome}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Factory size={12} />
                        {riga.mulino_nome}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => rimuoviRiga(riga.id)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {formData.tipo_ordine === 'pedane' && (
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">
                          Pedane{clienteSelezionato?.pedana_standard ? ` (${clienteSelezionato.pedana_standard} q/ped)` : ''}
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={riga.pedane}
                          onChange={(e) => aggiornaRiga(riga.id, 'pedane', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          placeholder="0"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Quintali</label>
                      <input
                        type="number"
                        step="0.01"
                        value={riga.quintali}
                        onChange={(e) => aggiornaRiga(riga.id, 'quintali', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="0"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">€/quintale</label>
                      <input
                        type="number"
                        step="0.01"
                        value={riga.prezzo_quintale}
                        onChange={(e) => aggiornaRiga(riga.id, 'prezzo_quintale', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-2 text-right">
                    <span className="text-sm text-slate-500">Totale: </span>
                    <span className="font-bold">€{riga.prezzo_totale}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer fisso con totali */}
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-64 bg-white border-t border-slate-200 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Totale ordine</p>
              <p className="text-xl font-black">
                {totaleQuintali.toFixed(1)} q · €{totaleImporto.toFixed(2)}
              </p>
            </div>
            <button
              type="submit"
              disabled={saving || righe.length === 0}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvataggio...' : 'Crea Ordine'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
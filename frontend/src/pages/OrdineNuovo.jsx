import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Package, Trash2, Factory, ChevronDown, ChevronUp,
  Plus, X, Search, AlertCircle
} from 'lucide-react';
import { ordiniApi, clientiApi, muliniApi, trasportatoriApi } from '@/lib/api';
import DateHeader from '@/components/DateHeader';

export default function OrdineNuovo() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isModifica = Boolean(id);
  const [searchParams] = useSearchParams();
  const clienteIdParam = searchParams.get('cliente');

  // Stati principali
  const [clienti, setClienti] = useState([]);
  const [mulini, setMulini] = useState([]);
  const [trasportatori, setTrasportatori] = useState([]);
  const [prodottiPerMulino, setProdottiPerMulino] = useState({});

  // Form
  const [formData, setFormData] = useState({
    cliente_id: clienteIdParam || '',
    data_ordine: new Date().toISOString().split('T')[0],
    data_ritiro: '',
    data_incasso_mulino: '',
    tipo_ordine: 'pedane',
    trasportatore_id: '',
    note: '',
  });

  // Cliente autocomplete
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [clienteSelezionato, setClienteSelezionato] = useState(null);
  const clienteInputRef = useRef(null);

  // Prodotti e righe
  const [righe, setRighe] = useState([]);
  const [showModalProdotti, setShowModalProdotti] = useState(false);
  const [mulinoModalSelezionato, setMulinoModalSelezionato] = useState('');
  const [prodottiModal, setProdottiModal] = useState([]);
  const [filtroProdotti, setFiltroProdotti] = useState('');
  const [prodottoSelezionato, setProdottoSelezionato] = useState(null);
  const [quantitaModal, setQuantitaModal] = useState({ pedane: '', quintali: '', prezzo: '' });

  // Mulino autocomplete nel modal
  const [mulinoSearch, setMulinoSearch] = useState('');
  const [showMulinoDropdown, setShowMulinoDropdown] = useState(false);
  const [mulinoSelezionatoObj, setMulinoSelezionatoObj] = useState(null);
  const mulinoInputRef = useRef(null);

  // UI
  const [expanded, setExpanded] = useState(true);
  const [expandedAltro, setExpandedAltro] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);  // ← AGGIUNGI QUESTA RIGA
  const [erroriDate, setErroriDate] = useState({});

  // Caricamento iniziale
  useEffect(() => {
    caricaDati();
  }, []);

  // Carica cliente se passato come parametro
  useEffect(() => {
    if (clienteIdParam && clienti.length > 0) {
      const cliente = clienti.find(c => c.id === parseInt(clienteIdParam));
      if (cliente) {
        setClienteSelezionato(cliente);
        setClienteSearch(cliente.nome);
        setFormData(prev => ({ ...prev, cliente_id: cliente.id }));
      }
    }
  }, [clienteIdParam, clienti]);

  // Carica dati ordine esistente se in modalità modifica
  useEffect(() => {
    if (!isModifica) return;

    const caricaOrdine = async () => {
      try {
        setLoading(true);
        const { data: ordine } = await ordiniApi.dettaglio(id);

        // Imposta i dati del form
        setFormData({
          cliente_id: ordine.cliente_id,
          data_ordine: ordine.data_ordine,
          data_ritiro: ordine.data_ritiro || '',
          data_incasso_mulino: ordine.data_incasso_mulino || '',
          tipo_ordine: ordine.tipo_ordine,
          trasportatore_id: ordine.trasportatore_id || '',
          note: ordine.note || ''
        });

        // Carica il cliente selezionato
        const { data: cliente } = await clientiApi.dettaglio(ordine.cliente_id);
        setClienteSelezionato(cliente);
        setClienteSearch(cliente.nome);

        // Carica le righe esistenti
        const righeCaricate = ordine.righe.map(riga => ({
          id: riga.id,
          prodotto_id: riga.prodotto_id,
          prodotto_nome: riga.prodotto_nome,
          prodotto_tipologia: riga.prodotto_tipologia,
          mulino_id: riga.mulino_id,
          mulino_nome: riga.mulino_nome,
          pedane: riga.pedane,
          quintali: parseFloat(riga.quintali),
          prezzo_quintale: parseFloat(riga.prezzo_quintale),
          prezzo_totale: parseFloat(riga.prezzo_totale),
        }));
        setRighe(righeCaricate);

      } catch (error) {
        console.error('Errore caricamento ordine:', error);
        alert('Errore nel caricamento dell\'ordine');
        navigate('/ordini');
      } finally {
        setLoading(false);
      }
    };

    caricaOrdine();
  }, [id, isModifica, navigate]);

  const caricaDati = async () => {
    try {
      const [clientiRes, muliniRes, traspRes] = await Promise.all([
        clientiApi.lista(),
        muliniApi.lista(),
        trasportatoriApi.lista(),
      ]);
      setClienti(clientiRes.data);
      setMulini(muliniRes.data);
      setTrasportatori(traspRes.data);

      // Carica prodotti per ogni mulino
      const prodotti = {};
      for (const mulino of muliniRes.data) {
        const { data } = await muliniApi.prodotti(mulino.id);
        prodotti[mulino.id] = data;
      }
      setProdottiPerMulino(prodotti);
    } catch (error) {
      console.error('Errore caricamento dati:', error);
    }
  };

  // === CLIENTE AUTOCOMPLETE ===
  const clientiFiltrati = clienti.filter(c =>
    c.nome.toLowerCase().includes(clienteSearch.toLowerCase())
  );

  const handleClienteSelect = (cliente) => {
    setClienteSelezionato(cliente);
    setClienteSearch(cliente.nome);
    setFormData(prev => ({ ...prev, cliente_id: cliente.id }));
    setShowClienteDropdown(false);
  };

  const handleClienteInputChange = (e) => {
    const value = e.target.value;
    setClienteSearch(value);
    setShowClienteDropdown(true);

    // Reset selezione se si modifica il testo
    if (clienteSelezionato && clienteSelezionato.nome !== value) {
      setClienteSelezionato(null);
      setFormData(prev => ({ ...prev, cliente_id: '' }));
    }
  };

  // === VALIDAZIONE DATE ===
  const validaDate = (campo, valore) => {
    const errori = { ...erroriDate };

    if (campo === 'data_ritiro' && valore && formData.data_ordine) {
      if (new Date(valore) < new Date(formData.data_ordine)) {
        errori.data_ritiro = 'La data ritiro deve essere uguale o successiva alla data ordine';
      } else {
        delete errori.data_ritiro;
      }
    }

    if (campo === 'data_ordine' && formData.data_ritiro) {
      if (new Date(formData.data_ritiro) < new Date(valore)) {
        errori.data_ritiro = 'La data ritiro deve essere uguale o successiva alla data ordine';
      } else {
        delete errori.data_ritiro;
      }
    }

    setErroriDate(errori);
    return Object.keys(errori).length === 0;
  };

  const handleDataChange = (campo, valore) => {
    setFormData(prev => ({ ...prev, [campo]: valore }));
    validaDate(campo, valore);

    // Calcola data incasso RIBA
    if (campo === 'data_ritiro' && clienteSelezionato?.riba && valore) {
      const dataRitiro = new Date(valore);
      // Fine mese
      const fineMese = new Date(dataRitiro.getFullYear(), dataRitiro.getMonth() + 1, 0);
      // +60 giorni
      const dataIncasso = new Date(fineMese);
      dataIncasso.setDate(dataIncasso.getDate() + 60);
      setFormData(prev => ({
        ...prev,
        data_ritiro: valore,
        data_incasso_mulino: dataIncasso.toISOString().split('T')[0]
      }));
    }
  };

  // === MULINO AUTOCOMPLETE (MODAL) ===
  const muliniFiltrati = mulini.filter(m =>
    m.nome.toLowerCase().includes(mulinoSearch.toLowerCase())
  );

  const handleMulinoSelect = (mulino) => {
    setMulinoSelezionatoObj(mulino);
    setMulinoSearch(mulino.nome);
    setMulinoModalSelezionato(mulino.id.toString());
    setProdottiModal(prodottiPerMulino[mulino.id] || []);
    setProdottoSelezionato(null);
    setFiltroProdotti('');
    setShowMulinoDropdown(false);
  };

  const handleMulinoInputChange = (e) => {
    const value = e.target.value;
    setMulinoSearch(value);
    setShowMulinoDropdown(true);
    if (mulinoSelezionatoObj && mulinoSelezionatoObj.nome !== value) {
      setMulinoSelezionatoObj(null);
      setMulinoModalSelezionato('');
      setProdottiModal([]);
      setProdottoSelezionato(null);
      setFiltroProdotti('');
    }
  };

  // Mulino dell'ordine corrente (se righe già presenti, è fissato)
  const mulinoOrdine = righe.length > 0 ? { id: righe[0].mulino_id, nome: righe[0].mulino_nome } : null;

  // === MODAL PRODOTTI ===
  const apriModalProdotti = () => {
    setShowModalProdotti(true);
    // Se c'è già un mulino nell'ordine, pre-selezionalo
    if (mulinoOrdine) {
      const mulino = mulini.find(m => m.id === mulinoOrdine.id);
      if (mulino) {
        setMulinoSelezionatoObj(mulino);
        setMulinoSearch(mulino.nome);
        setMulinoModalSelezionato(mulino.id.toString());
        setProdottiModal(prodottiPerMulino[mulino.id] || []);
      }
    } else {
      setMulinoModalSelezionato('');
      setMulinoSelezionatoObj(null);
      setMulinoSearch('');
      setProdottiModal([]);
    }
    setFiltroProdotti('');
    setProdottoSelezionato(null);
    setQuantitaModal({ pedane: '', quintali: '', prezzo: '' });
  };

  const prodottiModalFiltrati = prodottiModal.filter(p =>
    p.nome.toLowerCase().includes(filtroProdotti.toLowerCase()) ||
    (p.tipologia && p.tipologia.toLowerCase().includes(filtroProdotti.toLowerCase()))
  );

  const handleSelezionaProdotto = async (prodotto) => {
    setProdottoSelezionato(prodotto);

    // Carica ultimo prezzo se cliente selezionato
    if (clienteSelezionato) {
      try {
        const { data } = await ordiniApi.ultimoPrezzo(clienteSelezionato.id, prodotto.id);
        if (data?.prezzo) {
          setQuantitaModal(prev => ({ ...prev, prezzo: data.prezzo.toString() }));
        }
      } catch (error) {
        // Nessun prezzo precedente
      }
    }
  };

  const aggiungiProdottoAllaLista = () => {
    if (!prodottoSelezionato) return;

    const mulino = mulini.find(m => m.id === parseInt(mulinoModalSelezionato));
    const pedane = parseFloat(quantitaModal.pedane) || 0;
    const quintaliBase = parseFloat(quantitaModal.quintali) || 0;
    const prezzo = parseFloat(quantitaModal.prezzo) || 0;

    // Calcola quintali
    let quintali = quintaliBase;
    if (formData.tipo_ordine === 'pedane' && pedane > 0 && clienteSelezionato?.pedana_standard) {
      quintali = pedane * parseFloat(clienteSelezionato.pedana_standard);
    }

    const nuovaRiga = {
      id: Date.now(),
      prodotto_id: prodottoSelezionato.id,
      prodotto_nome: prodottoSelezionato.nome,
      prodotto_tipologia: prodottoSelezionato.tipologia,
      mulino_id: parseInt(mulinoModalSelezionato),
      mulino_nome: mulino?.nome,
      pedane: pedane || null,
      quintali: quintali,
      prezzo_quintale: prezzo,
      prezzo_totale: quintali * prezzo,
    };

    setRighe(prev => [...prev, nuovaRiga]);

    // Reset per aggiungere altro prodotto
    setProdottoSelezionato(null);
    setQuantitaModal({ pedane: '', quintali: '', prezzo: '' });
  };

  const rimuoviRiga = (rigaId) => {
    setRighe(righe.filter(r => r.id !== rigaId));
  };

  const aggiornaRiga = (rigaId, campo, valore) => {
    setRighe(righe.map(riga => {
      if (riga.id !== rigaId) return riga;

      const nuovaRiga = { ...riga, [campo]: valore };

      // Ricalcola quintali se cambiano pedane
      if (campo === 'pedane' && formData.tipo_ordine === 'pedane' && clienteSelezionato?.pedana_standard) {
        nuovaRiga.quintali = parseFloat(valore || 0) * parseFloat(clienteSelezionato.pedana_standard);
      }

      // Ricalcola totale
      if (campo === 'pedane' || campo === 'quintali' || campo === 'prezzo_quintale') {
        const quintali = campo === 'quintali' ? parseFloat(valore || 0) : nuovaRiga.quintali;
        const prezzo = campo === 'prezzo_quintale' ? parseFloat(valore || 0) : nuovaRiga.prezzo_quintale;
        nuovaRiga.prezzo_totale = quintali * prezzo;
      }

      return nuovaRiga;
    }));
  };

  // === CALCOLI ===
  const calcolaTotali = () => {
    const totaleQuintali = righe.reduce((sum, r) => sum + (parseFloat(r.quintali) || 0), 0);
    const totaleImporto = righe.reduce((sum, r) => sum + (parseFloat(r.prezzo_totale) || 0), 0);
    return { totaleQuintali, totaleImporto };
  };

  // === SUBMIT ===
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

    if (Object.keys(erroriDate).length > 0) {
      alert('Correggi gli errori nelle date');
      return;
    }

    setSaving(true);
    try {
      const ordineData = {
        ...formData,
        cliente_id: parseInt(formData.cliente_id),
        trasportatore_id: formData.trasportatore_id ? parseInt(formData.trasportatore_id) : null,
        data_ritiro: formData.data_ritiro || null,
        data_incasso_mulino: formData.data_incasso_mulino || null,
        righe: righe.map(r => ({
          prodotto_id: r.prodotto_id,
          mulino_id: r.mulino_id,
          pedane: r.pedane ? parseFloat(r.pedane) : null,
          quintali: parseFloat(r.quintali),
          prezzo_quintale: parseFloat(r.prezzo_quintale),
          prezzo_totale: parseFloat(r.prezzo_totale),
        })),
      };

      if (isModifica) {
        await ordiniApi.aggiorna(id, ordineData);
        navigate(`/ordini/${id}`);
      } else {
        const { data } = await ordiniApi.crea(ordineData);
        navigate(`/ordini/${data.id}`);
      }
    } catch (error) {
      console.error('Errore creazione ordine:', error);
      alert('Errore durante la creazione dell\'ordine');
    } finally {
      setSaving(false);
    }
  };

  const { totaleQuintali, totaleImporto } = calcolaTotali();

  // Stile input uniforme
  const inputClass = "w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-base";

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-32">
      {/* Data */}
      <DateHeader />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">{isModifica ? 'Modifica Ordine' : 'Nuovo Ordine'}</h1>
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
              {/* Cliente Autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cliente *
                </label>
                <div className="relative">
                  <input
                    ref={clienteInputRef}
                    type="text"
                    value={clienteSearch}
                    onChange={handleClienteInputChange}
                    onFocus={() => setShowClienteDropdown(true)}
                    onBlur={() => setTimeout(() => setShowClienteDropdown(false), 200)}
                    placeholder="Digita per cercare..."
                    className={inputClass}
                    required={!formData.cliente_id}
                  />
                  {clienteSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setClienteSearch('');
                        setClienteSelezionato(null);
                        setFormData(prev => ({ ...prev, cliente_id: '' }));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* Dropdown clienti */}
                {showClienteDropdown && !clienteSelezionato && clientiFiltrati.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {clientiFiltrati.slice(0, 3).map(cliente => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => handleClienteSelect(cliente)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{cliente.nome}</p>
                          {cliente.indirizzo_consegna && (
                            <p className="text-sm text-slate-500 truncate">{cliente.indirizzo_consegna}</p>
                          )}
                        </div>
                        {cliente.riba && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">RIBA</span>
                        )}
                      </button>
                    ))}
                    {clientiFiltrati.length > 3 && (
                      <div className="px-4 py-2 text-center text-sm text-slate-400">
                        ...
                      </div>
                    )}
                  </div>
                )}

                {showClienteDropdown && !clienteSelezionato && clienteSearch && clientiFiltrati.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center text-slate-500">
                    Nessun cliente trovato
                  </div>
                )}

                {clienteSelezionato?.riba && (
                  <p className="mt-1 text-sm text-blue-600">
                    ⓘ Cliente RIBA - data incasso calcolata automaticamente
                  </p>
                )}
                {clienteSelezionato?.pedana_standard && formData.tipo_ordine === 'pedane' && (
                  <p className="mt-1 text-sm text-emerald-600">
                    ⓘ Pedana standard: {clienteSelezionato.pedana_standard} quintali
                  </p>
                )}
              </div>

              {/* Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data ordine *
                  </label>
                  <input
                    type="date"
                    value={formData.data_ordine}
                    onChange={(e) => handleDataChange('data_ordine', e.target.value)}
                    onClick={(e) => e.target.showPicker?.()}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data ritiro
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.data_ritiro}
                      onChange={(e) => handleDataChange('data_ritiro', e.target.value)}
                      onClick={(e) => e.target.showPicker?.()}
                      className={`${inputClass} ${erroriDate.data_ritiro ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {formData.data_ritiro && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, data_ritiro: '', data_incasso_mulino: '' }));
                          const newErrori = { ...erroriDate };
                          delete newErrori.data_ritiro;
                          setErroriDate(newErrori);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                  {erroriDate.data_ritiro && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {erroriDate.data_ritiro}
                    </p>
                  )}
                </div>
              </div>

              {/* Data incasso mulino */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data incasso mulino
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.data_incasso_mulino}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_incasso_mulino: e.target.value }))}
                    onClick={(e) => e.target.showPicker?.()}
                    className={inputClass}
                  />
                  {formData.data_incasso_mulino && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, data_incasso_mulino: '' }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                {clienteSelezionato?.riba && (
                  <p className="mt-1 text-sm text-blue-600">
                    Calcolata automaticamente per clienti RIBA
                  </p>
                )}
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
            </div>
          )}
        </div>

        {/* Sezione Prodotti */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-bold">Prodotti</h3>
            </div>
            <button
              type="button"
              onClick={apriModalProdotti}
              disabled={!clienteSelezionato}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-black transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <Plus size={18} />
              Aggiungi
            </button>
          </div>
          <div className="flex gap-1 mb-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipo_ordine: 'pedane' })}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${formData.tipo_ordine === 'pedane'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
            >
              Pedane
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipo_ordine: 'sfuso' })}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${formData.tipo_ordine === 'sfuso'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
            >
              Sfuso
            </button>
          </div>

          {/* Righe ordine */}
          {righe.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Package size={32} className="mx-auto mb-2" />
              <p className="text-sm">
                {!clienteSelezionato
                  ? 'Seleziona un cliente per aggiungere prodotti'
                  : 'Clicca "Aggiungi" per inserire prodotti'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {righe.map((riga) => (
                <div key={riga.id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold">{riga.prodotto_nome}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Factory size={12} />
                        {riga.mulino_nome}
                        {riga.prodotto_tipologia && (
                          <span className="ml-2 bg-slate-200 px-1.5 py-0.5 rounded">
                            Tipo {riga.prodotto_tipologia}
                          </span>
                        )}
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
                        <label className="block text-xs text-slate-500 mb-1">Pedane</label>
                        <input
                          type="number"
                          step="0.5"
                          value={riga.pedane || ''}
                          onChange={(e) => aggiornaRiga(riga.id, 'pedane', e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Quintali</label>
                      <input
                        type="number"
                        step="0.1"
                        value={riga.quintali || ''}
                        onChange={(e) => aggiornaRiga(riga.id, 'quintali', e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                        readOnly={formData.tipo_ordine === 'pedane' && clienteSelezionato?.pedana_standard}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">€/quintale</label>
                      <input
                        type="number"
                        step="0.01"
                        value={riga.prezzo_quintale || ''}
                        onChange={(e) => aggiornaRiga(riga.id, 'prezzo_quintale', e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-2 text-right">
                    <span className="text-sm text-slate-500">Totale: </span>
                    <span className="font-bold">
                      €{(riga.prezzo_totale || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sezione Altro (Note) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <button
            type="button"
            onClick={() => setExpandedAltro(!expandedAltro)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="font-bold">Altro</h3>
            {expandedAltro ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {expandedAltro && (
            <div className="mt-4 space-y-4">
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
            </div>
          )}
        </div>

        {/* Riepilogo e Submit */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:relative md:border-0 md:bg-transparent md:p-0 md:mt-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Totale ordine</p>
              <p className="text-xl font-black">
                {totaleQuintali.toFixed(1)} q · €{totaleImporto.toFixed(2)}
              </p>
            </div>
            <button
              type="submit"
              disabled={saving || righe.length === 0 || !formData.cliente_id}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvataggio...' : (isModifica ? 'Salva Modifiche' : 'Crea Ordine')}
            </button>
          </div>
        </div>
      </form>

      {/* MODAL SELEZIONE PRODOTTI */}
      {showModalProdotti && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold">Aggiungi Prodotti</h3>
              <button
                onClick={() => setShowModalProdotti(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenuto Modal */}
            <div className="flex-1 overflow-y-auto p-5 min-h-0">
              {/* Selezione Mulino (autocomplete) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mulino
                  {mulinoOrdine && (
                    <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      Fissato: {mulinoOrdine.nome}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    ref={mulinoInputRef}
                    type="text"
                    value={mulinoSearch}
                    onChange={mulinoOrdine ? undefined : handleMulinoInputChange}
                    onFocus={() => !mulinoOrdine && setShowMulinoDropdown(true)}
                    onBlur={() => setTimeout(() => setShowMulinoDropdown(false), 200)}
                    placeholder="Digita per cercare..."
                    readOnly={!!mulinoOrdine}
                    className={`${inputClass} ${mulinoOrdine ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                  />
                  {mulinoSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setMulinoSearch('');
                        setMulinoSelezionatoObj(null);
                        setMulinoModalSelezionato('');
                        setProdottiModal([]);
                        setProdottoSelezionato(null);
                        setFiltroProdotti('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {showMulinoDropdown && !mulinoSelezionatoObj && muliniFiltrati.length > 0 && (
                  <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {muliniFiltrati.slice(0, 3).map(mulino => (
                      <button
                        key={mulino.id}
                        type="button"
                        onClick={() => handleMulinoSelect(mulino)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50"
                      >
                        <p className="font-medium">{mulino.nome}</p>
                      </button>
                    ))}
                    {muliniFiltrati.length > 3 && (
                      <div className="px-4 py-2 text-center text-sm text-slate-400">
                        ...
                      </div>
                    )}
                  </div>
                )}

                {showMulinoDropdown && !mulinoSelezionatoObj && mulinoSearch && muliniFiltrati.length === 0 && (
                  <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center text-slate-500">
                    Nessun mulino trovato
                  </div>
                )}
              </div>

              {/* Lista Prodotti */}
              {mulinoSelezionatoObj && (
                <>
                  {/* Filtro prodotti */}
                  <div className="mb-4 relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filtra prodotti..."
                      value={filtroProdotti}
                      onChange={(e) => setFiltroProdotti(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  {/* Griglia prodotti */}
                  <div className="grid grid-cols-2 gap-2 mb-4 max-h-52 overflow-y-auto">
                    {prodottiModalFiltrati.map(prod => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleSelezionaProdotto(prod)}
                        className={`p-3 text-left rounded-xl transition-colors ${prodottoSelezionato?.id === prod.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                      >
                        <p className="font-medium text-sm truncate">{prod.nome}</p>
                        {prod.tipologia && (
                          <p className={`text-xs ${prodottoSelezionato?.id === prod.id ? 'text-slate-300' : 'text-slate-500'}`}>
                            Tipo {prod.tipologia}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Form quantità (visibile solo se prodotto selezionato) */}
                  {prodottoSelezionato && (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                      <p className="font-bold text-emerald-800 mb-3">
                        {prodottoSelezionato.nome}
                        {prodottoSelezionato.tipologia && ` (Tipo ${prodottoSelezionato.tipologia})`}
                      </p>

                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {formData.tipo_ordine === 'pedane' && (
                          <div>
                            <label className="block text-xs text-emerald-700 mb-1">Pedane</label>
                            <input
                              type="number"
                              step="0.5"
                              value={quantitaModal.pedane}
                              onChange={(e) => {
                                const pedane = parseFloat(e.target.value) || 0;
                                const quintali = clienteSelezionato?.pedana_standard
                                  ? pedane * parseFloat(clienteSelezionato.pedana_standard)
                                  : '';
                                setQuantitaModal(prev => ({
                                  ...prev,
                                  pedane: e.target.value,
                                  quintali: quintali.toString()
                                }));
                              }}
                              className="w-full px-3 py-2.5 border border-emerald-300 rounded-lg text-sm"
                              placeholder="0"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-xs text-emerald-700 mb-1">Quintali</label>
                          <input
                            type="number"
                            step="0.1"
                            value={quantitaModal.quintali}
                            onChange={(e) => setQuantitaModal(prev => ({ ...prev, quintali: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-emerald-300 rounded-lg text-sm"
                            placeholder="0"
                            readOnly={formData.tipo_ordine === 'pedane' && clienteSelezionato?.pedana_standard}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-emerald-700 mb-1">€/quintale</label>
                          <input
                            type="number"
                            step="0.01"
                            value={quantitaModal.prezzo}
                            onChange={(e) => setQuantitaModal(prev => ({ ...prev, prezzo: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-emerald-300 rounded-lg text-sm"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={aggiungiProdottoAllaLista}
                        disabled={!quantitaModal.quintali && !quantitaModal.pedane}
                        className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                      >
                        + Aggiungi alla lista
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Riepilogo prodotti aggiunti */}
              {righe.length > 0 && (
                <div className="mt-4 p-4 bg-slate-100 rounded-xl">
                  <p className="text-sm font-medium text-slate-600 mb-2">
                    Prodotti aggiunti ({righe.length} - {righe.reduce((sum, r) => sum + (parseFloat(r.quintali) || 0), 0).toFixed(1)} quintali)
                  </p>
                  <div className="space-y-2">
                    {righe.map(r => (
                      <div key={r.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{r.prodotto_nome}</span>
                          {r.prodotto_tipologia && (
                            <span className="ml-1.5 text-xs text-slate-500">Tipo {r.prodotto_tipologia}</span>
                          )}
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Factory size={10} />
                            {r.mulino_nome}
                          </p>
                        </div>
                        <span className="text-slate-500 whitespace-nowrap ml-2">{r.quintali}q · €{r.prezzo_totale?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModalProdotti(false)}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200"
              >
                Torna all'ordine
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModalProdotti(false);
                  handleSubmit(new Event('submit'));
                }}
                disabled={saving || righe.length === 0 || !formData.cliente_id}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-black transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvataggio...' : (isModifica ? 'Salva Modifiche' : 'Crea Ordine')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
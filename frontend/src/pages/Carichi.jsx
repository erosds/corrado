import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Truck, ChevronRight, Package, CheckCircle, AlertCircle, 
  Clock, X, ChevronUp, ChevronDown, Edit, Trash2, Filter,
  Layers, List, Lightbulb, Factory, Calendar, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { carichiApi, trasportatoriApi, ordiniApi } from '@/lib/api';
import DateHeader from '@/components/DateHeader';
import CaricoCard from '@/components/carichi/CaricoCard';

// Costanti
const OBIETTIVO_QUINTALI = 300;
const SOGLIA_MINIMA = 280;
const SOGLIA_MASSIMA = 320;

export default function Carichi() {
  const navigate = useNavigate();
  
  // Tab attivo: 'composizione' o 'lista'
  const [tab, setTab] = useState('composizione');
  
  // === Stati per TAB COMPOSIZIONE ===
  const [ordiniDisponibili, setOrdiniDisponibili] = useState([]);
  const [carichiAperti, setCarichiAperti] = useState([]);
  const [suggerimenti, setSuggerimenti] = useState([]);
  const [muliniConOrdini, setMuliniConOrdini] = useState([]);
  const [filtroMulino, setFiltroMulino] = useState('');
  const [filtroTipoComp, setFiltroTipoComp] = useState(''); // 'pedane' | 'sfuso' | ''
  const [loadingComp, setLoadingComp] = useState(true);
  
  // === Stati per TAB LISTA ===
  const [carichi, setCarichi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStato, setFiltroStato] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [ordinamento, setOrdinamento] = useState({ campo: 'creato_il', direzione: 'desc' });
  
  // === Stati comuni ===
  const [showForm, setShowForm] = useState(false);
  const [caricoModifica, setCaricoModifica] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [showAssegnaModal, setShowAssegnaModal] = useState(false);
  const [ordineSelezionato, setOrdineSelezionato] = useState(null);

  // Calcola stato da data (ordine o carico)
  const calcolaStato = (dataRitiro) => {
    if (!dataRitiro) return 'inserito';
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const ritiro = new Date(dataRitiro);
    ritiro.setHours(0, 0, 0, 0);
    return ritiro <= oggi ? 'ritirato' : 'inserito';
  };

  const calcolaStatoCarico = (dataCarico) => {
    if (!dataCarico) return 'aperto';
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const data = new Date(dataCarico);
    data.setHours(0, 0, 0, 0);
    return data <= oggi ? 'ritirato' : 'aperto';
  };

  // Carica dati in base al tab attivo
  useEffect(() => {
    if (tab === 'composizione') {
      caricaDatiComposizione();
    } else {
      caricaCarichi();
    }
  }, [tab, filtroMulino, filtroTipoComp, filtroStato, filtroTipo]);

  // === FUNZIONI TAB COMPOSIZIONE ===
  
  const caricaDatiComposizione = async () => {
    try {
      setLoadingComp(true);
      
      // Carica mulini con ordini (per filtro)
      const { data: mulini } = await ordiniApi.lista({ stato: 'inserito' });
      
      // Estrai mulini unici dagli ordini
      const muliniSet = new Map();
      mulini.forEach(ordine => {
        ordine.righe?.forEach(riga => {
          if (riga.mulino_id && riga.mulino_nome) {
            muliniSet.set(riga.mulino_id, riga.mulino_nome);
          }
        });
      });
      setMuliniConOrdini(Array.from(muliniSet, ([id, nome]) => ({ id, nome })));
      
      // Carica ordini non assegnati (stato calcolato da data)
      const ordiniNonAssegnati = mulini.filter(o => !o.carico_id && calcolaStato(o.data_ritiro) === 'inserito');
      
      // Raggruppa per mulino e tipo
      const gruppi = raggruppaOrdini(ordiniNonAssegnati, filtroMulino, filtroTipoComp);
      setOrdiniDisponibili(gruppi);
      
      // Genera suggerimenti
      const sugg = generaSuggerimenti(gruppi);
      setSuggerimenti(sugg);
      
      // Carica carichi aperti
      const { data: aperti } = await carichiApi.aperti();
      setCarichiAperti(aperti);
      
    } catch (error) {
      console.error('Errore caricamento composizione:', error);
    } finally {
      setLoadingComp(false);
    }
  };

  const raggruppaOrdini = (ordini, filtroMulinoId, filtroTipoOrdine) => {
    const gruppi = {};
    
    ordini.forEach(ordine => {
      // Applica filtro tipo
      if (filtroTipoOrdine && ordine.tipo_ordine !== filtroTipoOrdine) return;
      
      // Trova mulino principale dall'ordine
      const mulinoInfo = ordine.righe?.[0];
      if (!mulinoInfo?.mulino_id) return;
      
      // Applica filtro mulino
      if (filtroMulinoId && mulinoInfo.mulino_id !== parseInt(filtroMulinoId)) return;
      
      const key = `${mulinoInfo.mulino_id}-${ordine.tipo_ordine}`;
      
      if (!gruppi[key]) {
        gruppi[key] = {
          mulino_id: mulinoInfo.mulino_id,
          mulino_nome: mulinoInfo.mulino_nome || 'Mulino sconosciuto',
          tipo: ordine.tipo_ordine,
          ordini: [],
          totale_quintali: 0
        };
      }
      
      gruppi[key].ordini.push({
        ...ordine,
        totale_quintali: parseFloat(ordine.totale_quintali || 0)
      });
      gruppi[key].totale_quintali += parseFloat(ordine.totale_quintali || 0);
    });
    
    return Object.values(gruppi);
  };

  const generaSuggerimenti = (gruppi) => {
    const suggerimenti = [];
    
    gruppi.forEach(gruppo => {
      if (gruppo.ordini.length < 2) return;
      
      const ordini = [...gruppo.ordini].sort((a, b) => 
        (a.data_ritiro || a.data_ordine) > (b.data_ritiro || b.data_ordine) ? 1 : -1
      );
      
      // Trova coppie che sommano tra 280 e 320
      for (let i = 0; i < ordini.length; i++) {
        for (let j = i + 1; j < ordini.length; j++) {
          const totale = ordini[i].totale_quintali + ordini[j].totale_quintali;
          
          if (totale >= SOGLIA_MINIMA && totale <= SOGLIA_MASSIMA) {
            const diff = Math.abs(totale - OBIETTIVO_QUINTALI);
            
            suggerimenti.push({
              ordini: [ordini[i], ordini[j]],
              totale_quintali: totale,
              differenza: diff,
              mulino_nome: gruppo.mulino_nome,
              tipo: gruppo.tipo,
              score: 100 - diff
            });
          }
        }
        
        // Cerca anche triple
        for (let j = i + 1; j < ordini.length; j++) {
          for (let k = j + 1; k < ordini.length; k++) {
            const totale = ordini[i].totale_quintali + ordini[j].totale_quintali + ordini[k].totale_quintali;
            
            if (totale >= SOGLIA_MINIMA && totale <= SOGLIA_MASSIMA) {
              const diff = Math.abs(totale - OBIETTIVO_QUINTALI);
              
              suggerimenti.push({
                ordini: [ordini[i], ordini[j], ordini[k]],
                totale_quintali: totale,
                differenza: diff,
                mulino_nome: gruppo.mulino_nome,
                tipo: gruppo.tipo,
                score: 95 - diff // Penalità per triple
              });
            }
          }
        }
      }
    });
    
    // Ordina per score e prendi i migliori 5
    return suggerimenti.sort((a, b) => b.score - a.score).slice(0, 5);
  };

  const handleCreaDaSuggerimento = async (suggerimento) => {
    try {
      const { data: nuovoCarico } = await carichiApi.crea({
        tipo_carico: suggerimento.tipo,
        ordini_ids: suggerimento.ordini.map(o => o.id)
      });
      
      navigate(`/carichi/${nuovoCarico.id}`);
    } catch (error) {
      console.error('Errore creazione carico:', error);
      alert('Errore durante la creazione del carico');
    }
  };

  const handleAssegnaOrdine = (ordine) => {
    setOrdineSelezionato(ordine);
    setShowAssegnaModal(true);
  };

  const handleAssegnaACarico = async (caricoId) => {
    if (!ordineSelezionato) return;
    
    try {
      await carichiApi.aggiungiOrdine(caricoId, ordineSelezionato.id);
      setShowAssegnaModal(false);
      setOrdineSelezionato(null);
      caricaDatiComposizione();
    } catch (error) {
      console.error('Errore assegnazione:', error);
      alert(error.response?.data?.detail || 'Errore durante l\'assegnazione');
    }
  };

  const handleCreaConOrdine = async (ordine) => {
    try {
      const { data: nuovoCarico } = await carichiApi.crea({
        tipo_carico: ordine.tipo_ordine,
        ordini_ids: [ordine.id]
      });
      
      navigate(`/carichi/${nuovoCarico.id}`);
    } catch (error) {
      console.error('Errore creazione carico:', error);
      alert('Errore durante la creazione del carico');
    }
  };

  // === FUNZIONI TAB LISTA ===
  
  const caricaCarichi = async () => {
    try {
      setLoading(true);
      const params = {};
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

  // Conteggi per badge (stato calcolato da data)
  const carichiApertiCount = carichi.filter(c => calcolaStatoCarico(c.data_carico) === 'aperto').length;
  const carichiRitiratiCount = carichi.filter(c => calcolaStatoCarico(c.data_carico) === 'ritirato').length;
  const ordiniDaAssegnareCount = ordiniDisponibili.reduce((sum, g) => sum + g.ordini.length, 0);

  // Filtra e ordina carichi
  const carichiFiltrati = [...carichi].sort((a, b) => {
    const dir = ordinamento.direzione === 'asc' ? 1 : -1;
    if (ordinamento.campo === 'quintali') {
      return (parseFloat(a.totale_quintali) - parseFloat(b.totale_quintali)) * dir;
    }
    if (ordinamento.campo === 'data_carico') {
      return ((a.data_carico || '') > (b.data_carico || '') ? 1 : -1) * dir;
    }
    return ((a.creato_il || '') > (b.creato_il || '') ? 1 : -1) * dir;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <DateHeader />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Carichi</h1>
        <button
          onClick={() => {
            setCaricoModifica(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-black transition-colors"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nuovo Carico</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-2xl">
        <button
          onClick={() => setTab('composizione')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
            tab === 'composizione'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers size={18} />
          <span>Composizione</span>
          {ordiniDaAssegnareCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">
              {ordiniDaAssegnareCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('lista')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
            tab === 'lista'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <List size={18} />
          <span>Tutti i carichi</span>
          <span className="px-2 py-0.5 text-xs font-bold bg-slate-200 text-slate-600 rounded-full">
            {carichi.length}
          </span>
        </button>
      </div>

      {/* === TAB COMPOSIZIONE === */}
      {tab === 'composizione' && (
        <div className="space-y-6">
          {/* Filtri composizione */}
          <div className="flex flex-wrap gap-2">
            {/* Filtro Mulino */}
            <select
              value={filtroMulino}
              onChange={(e) => setFiltroMulino(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">Tutti i mulini</option>
              {muliniConOrdini.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
            
            {/* Filtro Tipo */}
            <button
              onClick={() => setFiltroTipoComp(filtroTipoComp === 'pedane' ? '' : 'pedane')}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                filtroTipoComp === 'pedane'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Pedane
            </button>
            <button
              onClick={() => setFiltroTipoComp(filtroTipoComp === 'sfuso' ? '' : 'sfuso')}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                filtroTipoComp === 'sfuso'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Sfuso
            </button>
          </div>

          {loadingComp ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                  <div className="h-5 bg-slate-200 rounded w-1/3 mb-3"></div>
                  <div className="h-3 bg-slate-100 rounded w-full mb-2"></div>
                  <div className="h-16 bg-slate-50 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Suggerimenti */}
              {suggerimenti.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb size={18} className="text-amber-500" />
                    <h2 className="font-semibold text-slate-700">Combinazioni suggerite</h2>
                  </div>
                  <div className="space-y-3">
                    {suggerimenti.slice(0, 3).map((sugg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-dashed border-amber-200 rounded-2xl p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Factory size={14} className="text-amber-600" />
                              <span className="text-sm font-medium text-amber-800">{sugg.mulino_nome}</span>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                sugg.tipo === 'pedane' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {sugg.tipo}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-slate-800">
                                {sugg.totale_quintali.toFixed(0)}
                              </span>
                              <span className="text-slate-500 text-sm">/ {OBIETTIVO_QUINTALI} q.li</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCreaDaSuggerimento(sugg)}
                            className="px-4 py-2 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-2"
                          >
                            <Plus size={16} />
                            Crea
                          </button>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="w-full bg-amber-100 rounded-full h-2 mb-3">
                          <div
                            className="h-2 rounded-full bg-amber-500"
                            style={{ width: `${Math.min(100, (sugg.totale_quintali / OBIETTIVO_QUINTALI) * 100)}%` }}
                          />
                        </div>
                        
                        {/* Ordini nel suggerimento */}
                        <div className="flex flex-wrap gap-2">
                          {sugg.ordini.map(ordine => (
                            <div key={ordine.id} className="px-3 py-1.5 bg-white rounded-lg text-sm">
                              <span className="font-medium">{ordine.cliente_nome}</span>
                              <span className="text-slate-500 ml-2">{ordine.totale_quintali.toFixed(0)} q.li</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Carichi aperti esistenti */}
              {carichiAperti.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Truck size={18} className="text-slate-600" />
                    <h2 className="font-semibold text-slate-700">Carichi in corso</h2>
                    <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-full">
                      {carichiAperti.length}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {carichiAperti.map(carico => {
                      const quintali = parseFloat(carico.totale_quintali || 0);
                      const percentuale = Math.min(100, (quintali / OBIETTIVO_QUINTALI) * 100);
                      const isCompleto = quintali >= SOGLIA_MINIMA;
                      
                      return (
                        <Link
                          key={carico.id}
                          to={`/carichi/${carico.id}`}
                          className={`block rounded-2xl p-4 transition-all hover:shadow-md ${
                            isCompleto 
                              ? 'bg-emerald-50 border-2 border-emerald-200' 
                              : 'bg-white border border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Carico #{carico.id}</span>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                carico.tipo_carico === 'pedane' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {carico.tipo_carico}
                              </span>
                              {isCompleto && (
                                <CheckCircle size={16} className="text-emerald-500" />
                              )}
                            </div>
                            <ChevronRight size={18} className="text-slate-400" />
                          </div>
                          
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-xl font-black">{quintali.toFixed(0)}</span>
                            <span className="text-slate-400 text-sm">/ {OBIETTIVO_QUINTALI} q.li</span>
                            {!isCompleto && (
                              <span className="text-xs text-amber-600 ml-2">
                                (mancano {(SOGLIA_MINIMA - quintali).toFixed(0)})
                              </span>
                            )}
                          </div>
                          
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${isCompleto ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${percentuale}%` }}
                            />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Ordini da assegnare raggruppati per mulino */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Package size={18} className="text-slate-600" />
                  <h2 className="font-semibold text-slate-700">Ordini da assegnare</h2>
                  <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-full">
                    {ordiniDaAssegnareCount}
                  </span>
                </div>

                {ordiniDisponibili.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl">
                    <CheckCircle size={48} className="mx-auto text-emerald-400 mb-3" />
                    <p className="text-slate-600 font-medium">Tutti gli ordini sono stati assegnati!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ordiniDisponibili.map(gruppo => (
                      <div key={`${gruppo.mulino_id}-${gruppo.tipo}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        {/* Header gruppo */}
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Factory size={18} className="text-slate-500" />
                            <span className="font-semibold text-slate-700">{gruppo.mulino_nome}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              gruppo.tipo === 'pedane' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {gruppo.tipo}
                            </span>
                          </div>
                          <div className="text-sm text-slate-500">
                            <span className="font-semibold text-slate-700">{gruppo.totale_quintali.toFixed(0)}</span> q.li totali
                          </div>
                        </div>
                        
                        {/* Lista ordini */}
                        <div className="divide-y divide-slate-100">
                          {gruppo.ordini.map(ordine => (
                            <div 
                              key={ordine.id}
                              className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-800 truncate">
                                  {ordine.cliente_nome}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                  <span className="font-semibold text-slate-700">
                                    {parseFloat(ordine.totale_quintali).toFixed(0)} q.li
                                  </span>
                                  {ordine.data_ritiro && (
                                    <span className="flex items-center gap-1">
                                      <Calendar size={12} />
                                      {formatDate(ordine.data_ritiro)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {/* Se quintali >= 280, può partire da solo */}
                                {parseFloat(ordine.totale_quintali) >= SOGLIA_MINIMA ? (
                                  <button
                                    onClick={() => handleCreaConOrdine(ordine)}
                                    className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-200 transition-colors"
                                  >
                                    Carico singolo
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAssegnaOrdine(ordine)}
                                    className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1"
                                  >
                                    <Plus size={14} />
                                    Assegna
                                  </button>
                                )}
                                
                                <Link
                                  to={`/ordini/${ordine.id}`}
                                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                >
                                  <ChevronRight size={16} />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* === TAB LISTA === */}
      {tab === 'lista' && (
        <>
          {/* Filtri lista */}
          <div className="flex flex-wrap gap-2 mb-6">
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
              Aperti ({carichiApertiCount})
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
              Ritirati ({carichiRitiratiCount})
            </button>
            
            <div className="w-px bg-slate-200 mx-2 hidden sm:block" />
            
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

          {/* Lista carichi */}
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
            <div className="text-center py-16">
              <Truck size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nessun carico trovato</p>
              <button
                onClick={() => {
                  setCaricoModifica(null);
                  setShowForm(true);
                }}
                className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-black transition-colors"
              >
                Crea il primo carico
              </button>
            </div>
          ) : (
            <div className="space-y-3">
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
                        {/* Header */}
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
                          {carico.data_carico && (
                            <span className="text-xs text-slate-500">
                              {formatDate(carico.data_carico)}
                            </span>
                          )}
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
                              style={{ width: `${percentuale}%` }}
                            />
                          </div>
                        </div>

                        {/* Info */}
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
          )}
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
            if (tab === 'composizione') {
              caricaDatiComposizione();
            } else {
              caricaCarichi();
            }
          }}
        />
      )}

      {/* Modal Assegna Ordine */}
      {showAssegnaModal && ordineSelezionato && (
        <ModalAssegnaOrdine
          ordine={ordineSelezionato}
          carichiAperti={carichiAperti.filter(c => c.tipo_carico === ordineSelezionato.tipo_ordine)}
          onAssegna={handleAssegnaACarico}
          onCrea={() => handleCreaConOrdine(ordineSelezionato)}
          onClose={() => {
            setShowAssegnaModal(false);
            setOrdineSelezionato(null);
          }}
        />
      )}
    </div>
  );
}


// === MODAL ASSEGNA ORDINE ===
function ModalAssegnaOrdine({ ordine, carichiAperti, onAssegna, onCrea, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Assegna ordine</h3>
            <p className="text-sm text-slate-500">
              {ordine.cliente_nome} - {parseFloat(ordine.totale_quintali).toFixed(0)} q.li
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[50vh]">
          {carichiAperti.length === 0 ? (
            <div className="text-center py-8">
              <Package size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 mb-4">Nessun carico aperto compatibile</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-2">Seleziona un carico esistente:</p>
              {carichiAperti.map(carico => {
                const quintali = parseFloat(carico.totale_quintali || 0);
                const nuovoTotale = quintali + parseFloat(ordine.totale_quintali);
                const percentuale = Math.min(100, (nuovoTotale / OBIETTIVO_QUINTALI) * 100);
                const sarebbeCompleto = nuovoTotale >= SOGLIA_MINIMA;
                
                return (
                  <button
                    key={carico.id}
                    onClick={() => onAssegna(carico.id)}
                    className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Carico #{carico.id}</span>
                      {sarebbeCompleto && (
                        <span className="text-xs text-emerald-600 font-medium">→ Completo!</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1 text-sm mb-2">
                      <span className="text-slate-500">{quintali.toFixed(0)}</span>
                      <ArrowRight size={12} className="text-slate-400" />
                      <span className="font-semibold text-slate-700">{nuovoTotale.toFixed(0)} q.li</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${sarebbeCompleto ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${percentuale}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-100">
          <button
            onClick={onCrea}
            className="w-full py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Crea nuovo carico
          </button>
        </div>
      </motion.div>
    </div>
  );
}


// === FORM CARICO (MODAL) ===
function FormCarico({ carico, onClose, onSaved }) {
  const isModifica = !!carico;
  const [saving, setSaving] = useState(false);
  const [trasportatori, setTrasportatori] = useState([]);
  const [formData, setFormData] = useState({
    tipo_carico: carico?.tipo_carico || 'pedane',
    data_carico: carico?.data_carico || '',
    trasportatore_id: carico?.trasportatore_id || '',
    stato: carico?.stato || 'aperto',
    note: carico?.note || ''
  });

  useEffect(() => {
    trasportatoriApi.lista().then(({ data }) => setTrasportatori(data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        trasportatore_id: formData.trasportatore_id || null,
        data_carico: formData.data_carico || null
      };

      if (isModifica) {
        await carichiApi.aggiorna(carico.id, payload);
      } else {
        await carichiApi.crea(payload);
      }
      onSaved();
    } catch (error) {
      console.error('Errore salvataggio:', error);
      alert(error.response?.data?.detail || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isModifica ? 'Modifica Carico' : 'Nuovo Carico'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo Carico */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo carico
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => !isModifica && setFormData({ ...formData, tipo_carico: 'pedane' })}
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
                onClick={() => !isModifica && setFormData({ ...formData, tipo_carico: 'sfuso' })}
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
          </div>

          {/* Data Carico */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Data ritiro carico
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

          {/* Stato (solo modifica) */}
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
              {saving ? 'Salvataggio...' : isModifica ? 'Salva' : 'Crea Carico'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
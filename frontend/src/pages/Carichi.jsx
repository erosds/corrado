import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Factory, Unlink, AlertCircle, GripVertical, Loader2, Check, Truck, Package } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';
import { ordiniApi, trasportatoriApi, muliniApi, carichiApi } from '@/lib/api';
import DateHeader from '@/components/DateHeader';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';  // AGGIUNGI QUESTO

// ============================================
// COMPONENTE RIGA CARICO DRAGGABLE
// ============================================
function SortableCaricoRow({
  carico,
  onSepara,
  onDataChange,
  onTraspChange,
  trasportatori,
  isUpdating,
  activeId  // NUOVO: ID dell'elemento in drag
}) {
  // Sortable per draggare
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: carico.id });

  // Droppable per ricevere
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: carico.id,
  });

  // Combina i ref
  const setNodeRef = (node) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  // Verifica compatibilità per feedback visivo
  const isValidTarget = activeId && activeId !== carico.id;
  const showDropHighlight = isOver && isValidTarget;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'all 200ms ease',
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.4 : 1,
  };

  const totaleQuintali = carico.ordini.reduce(
    (sum, o) => sum + parseFloat(o.totale_quintali || 0), 0
  );

  const isCompleto = totaleQuintali >= 280;
  const percentuale = Math.min(100, (totaleQuintali / 300) * 100);

  // Classi per il feedback visivo del drop target
  const rowClasses = `
    transition-all duration-200 ease-out
    ${isDragging ? 'bg-blue-50 scale-[0.98] shadow-lg' : 'hover:bg-slate-50/50'}
    ${showDropHighlight ? 'bg-gray-50 ring-2 ring-gray-400 ring-inset scale-[1.03]' : ''}
  `;

  return (
    <>
      {carico.ordini.map((o, idx) => (
        <tr
          key={o.id}
          ref={idx === 0 ? setNodeRef : null}
          style={idx === 0 ? style : {}}
          className={rowClasses}
        >
          {/* Grip per drag */}
          <td className="px-4 py-3 align-middle">
            {idx === 0 && (
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab text-slate-300 hover:text-slate-600 active:cursor-grabbing"
              >
                <GripVertical size={20} />
              </div>
            )}
          </td>

          {/* ID Ordine */}
          <td className="px-4 py-3 text-sm font-medium text-slate-400">#{o.id}</td>

          {/* Data Ordine */}
          <td className="px-4 py-3 text-sm text-slate-500">
            {o.data_ordine ? new Date(o.data_ordine).toLocaleDateString('it-IT') : '-'}
          </td>

          {/* Mulino */}
          <td className="px-4 py-3 text-sm text-slate-600">{carico.mulino_nome}</td>

          {/* Cliente + Bottone Separa */}
          <td className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">{o.cliente_nome}</span>
              {carico.ordini.length > 1 && (
                <button
                  onClick={() => onSepara(carico.id, o.id)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                  title="Separa ordine dal carico"
                  disabled={isUpdating}
                >
                  <Unlink size={14} />
                </button>
              )}
            </div>
          </td>

          {/* Quintali */}
          <td className="px-4 py-3 text-right font-bold text-slate-700">
            {parseFloat(o.totale_quintali || 0).toFixed(1)}
          </td>

          {/* Tipo */}
          <td className="px-4 py-3 text-center">
            <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase ${o.tipo_ordine === 'pedane'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
              }`}>
              {o.tipo_ordine === 'pedane' ? 'P' : 'S'}
            </span>
          </td>

          {/* Data Ritiro e Trasportatore - solo sulla prima riga */}
          {idx === 0 && (
            <>
              <td
                rowSpan={carico.ordini.length}
                className="px-4 py-3 text-center align-middle bg-slate-50/30"
              >
                <input
                  type="date"
                  value={carico.data_ritiro || ''}
                  onChange={(e) => onDataChange(carico.id, e.target.value)}
                  className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
                  disabled={isUpdating}
                />
              </td>
              <td
                rowSpan={carico.ordini.length}
                className="px-4 py-3 text-center align-middle bg-slate-50/30"
              >
                <select
                  value={carico.trasportatore_id || ''}
                  onChange={(e) => onTraspChange(carico.id, e.target.value)}
                  className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none bg-white w-36 focus:ring-2 focus:ring-blue-500"
                  disabled={isUpdating}
                >
                  <option value="">-</option>
                  {trasportatori.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </td>
              {/* Indicatore completamento */}
              <td
                rowSpan={carico.ordini.length}
                className="px-4 py-3 text-center align-middle"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${isCompleto ? 'bg-green-500' : 'bg-amber-500'
                        }`}
                      style={{ width: `${percentuale}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${isCompleto ? 'text-green-600' : 'text-amber-600'
                    }`}>
                    {totaleQuintali.toFixed(0)}q
                  </span>
                </div>
              </td>
            </>
          )}
        </tr>
      ))}
    </>
  );
}

// ============================================
// COMPONENTE PRINCIPALE
// ============================================
export default function Carichi() {
  // State per carichi e ordini
  const [carichiBozza, setCarichiBozza] = useState([]);      // Carichi dal DB (bozza)
  const [ordiniLiberi, setOrdiniLiberi] = useState([]);      // Ordini non assegnati < 280q
  const [ordiniGrandi, setOrdiniGrandi] = useState([]);      // Ordini >= 280q (diretti)

  const [activeId, setActiveId] = useState(null);
  // State per dati di supporto
  const [trasportatori, setTrasportatori] = useState([]);
  const [mulini, setMulini] = useState([]);
  const [filtroMulini, setFiltroMulini] = useState([]);

  // State per UI
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errore, setErrore] = useState('');
  const [successo, setSuccesso] = useState('');

  // ============================================
  // CARICAMENTO DATI
  // ============================================
  useEffect(() => {
    caricaDati();
  }, []);

  const caricaDati = async () => {
    try {
      setLoading(true);
      setErrore('');

      const [ordRes, traspRes, mulRes, carichiRes] = await Promise.all([
        ordiniApi.lista(),
        trasportatoriApi.lista(),
        muliniApi.lista(),
        carichiApi.lista({ stato: 'bozza' }), // Carica solo carichi in bozza
      ]);

      setTrasportatori(traspRes.data);
      setMulini(mulRes.data);

      // Filtra ordini futuri o senza data
      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);

      const ordiniFiltrati = ordRes.data.filter(o => {
        if (o.stato === 'ritirato') return false;
        if (!o.data_ritiro) return true;
        return new Date(o.data_ritiro) >= oggi;
      });

      // Separa ordini grandi (>= 280q) da piccoli
      const grandi = ordiniFiltrati.filter(o =>
        parseFloat(o.totale_quintali) >= 280 && !o.carico_id
      );
      setOrdiniGrandi(grandi);

      // Ordini piccoli NON assegnati a carichi
      const liberi = ordiniFiltrati.filter(o =>
        parseFloat(o.totale_quintali) < 280 && !o.carico_id
      );

      // Trasforma in formato "carico singolo" per uniformità UI
      const ordiniComeCarichi = liberi.map(o => {
        const mulinoId = o.righe?.[0]?.mulino_id;
        const mulinoNome = o.righe?.[0]?.mulino_nome ||
          mulRes.data.find(m => m.id === mulinoId)?.nome || 'N/D';

        return {
          id: `ordine-${o.id}`,        // ID temporaneo per drag&drop
          ordine_id: o.id,              // ID reale dell'ordine
          is_ordine_singolo: true,      // Flag per distinguere
          mulino_id: mulinoId,
          mulino_nome: mulinoNome,
          tipo_ordine: o.tipo_ordine,
          data_ritiro: o.data_ritiro,
          trasportatore_id: o.trasportatore_id,
          ordini: [{
            id: o.id,
            cliente_nome: o.cliente_nome,
            data_ordine: o.data_ordine,
            data_ritiro: o.data_ritiro,
            tipo_ordine: o.tipo_ordine,
            totale_quintali: o.totale_quintali,
          }]
        };
      });

      // Carichi esistenti dal DB
      const carichiEsistenti = await Promise.all(
        carichiRes.data.map(async (c) => {
          // Carica ordini del carico
          const ordiniCarico = ordiniFiltrati.filter(o => o.carico_id === c.id);
          const mulinoNome = mulRes.data.find(m => m.id === c.mulino_id)?.nome || 'N/D';

          return {
            id: `carico-${c.id}`,       // ID per drag&drop
            carico_id: c.id,             // ID reale del carico
            is_ordine_singolo: false,
            mulino_id: c.mulino_id,
            mulino_nome: mulinoNome,
            tipo_ordine: c.tipo,
            data_ritiro: c.data_ritiro,
            trasportatore_id: c.trasportatore_id,
            stato: c.stato,
            ordini: ordiniCarico.map(o => ({
              id: o.id,
              cliente_nome: o.cliente_nome,
              data_ordine: o.data_ordine,
              data_ritiro: o.data_ritiro,
              tipo_ordine: o.tipo_ordine,
              totale_quintali: o.totale_quintali,
            }))
          };
        })
      );

      // Unisci carichi esistenti + ordini singoli
      setCarichiBozza([...carichiEsistenti, ...ordiniComeCarichi]);

    } catch (error) {
      console.error('Errore caricamento:', error);
      setErrore('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // GESTIONE ERRORI E FEEDBACK
  // ============================================
  const mostraErrore = (msg) => {
    setErrore(msg);
    setTimeout(() => setErrore(''), 4000);
  };

  const mostraSuccesso = (msg) => {
    setSuccesso(msg);
    setTimeout(() => setSuccesso(''), 3000);
  };

  // ============================================
  // FILTRO PER MULINO
  // ============================================
  const carichiFiltrati = carichiBozza.filter(c =>
    filtroMulini.length === 0 || filtroMulini.includes(c.mulino_id)
  );

  // ============================================
  // DRAG & DROP - UNIONE CARICHI
  // ============================================
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const source = carichiBozza.find(c => c.id === active.id);
    const target = carichiBozza.find(c => c.id === over.id);

    if (!source || !target) return;

    // Validazioni
    if (source.mulino_id !== target.mulino_id) {
      return mostraErrore("Non puoi unire ordini di mulini diversi");
    }
    if (source.tipo_ordine !== target.tipo_ordine) {
      return mostraErrore("Non puoi unire ordini Sfuso con Pedane");
    }

    const pesoTotale = [...source.ordini, ...target.ordini]
      .reduce((s, o) => s + parseFloat(o.totale_quintali || 0), 0);

    if (pesoTotale > 300) {
      return mostraErrore(`Peso eccessivo: ${pesoTotale.toFixed(1)}q > 300q`);
    }

    setUpdating(true);

    try {
      // Caso 1: Target è un carico esistente → aggiungi ordini sorgente
      if (!target.is_ordine_singolo && target.carico_id) {
        // Aggiungi ogni ordine del sorgente al carico target
        for (const ordine of source.ordini) {
          await carichiApi.aggiungiOrdine(target.carico_id, ordine.id);
        }

        // Se il sorgente era anche un carico, ora è vuoto e verrà eliminato automaticamente
        mostraSuccesso('Ordini aggiunti al carico');
      }
      // Caso 2: Target è un ordine singolo → crea nuovo carico con entrambi
      else {
        const ordiniIds = [
          ...source.ordini.map(o => o.id),
          ...target.ordini.map(o => o.id)
        ];

        await carichiApi.creaBozza({ ordini_ids: ordiniIds });
        mostraSuccesso('Nuovo carico creato');
      }

      // Ricarica dati
      await caricaDati();

    } catch (error) {
      console.error('Errore unione:', error);
      mostraErrore(error.response?.data?.detail || 'Errore durante l\'unione');
    } finally {
      setUpdating(false);
    }
  };

  // ============================================
  // SEPARA ORDINE DA CARICO
  // ============================================
  const separaOrdine = async (caricoUiId, ordineId) => {
    const carico = carichiBozza.find(c => c.id === caricoUiId);
    if (!carico || carico.is_ordine_singolo) return;

    setUpdating(true);

    try {
      await carichiApi.rimuoviOrdine(carico.carico_id, ordineId);
      mostraSuccesso('Ordine separato dal carico');
      await caricaDati();
    } catch (error) {
      console.error('Errore separazione:', error);
      mostraErrore(error.response?.data?.detail || 'Errore durante la separazione');
    } finally {
      setUpdating(false);
    }
  };

  // ============================================
  // AGGIORNA CARICO (data ritiro / trasportatore)
  // ============================================
  const handleUpdateCaricoField = async (caricoUiId, field, value) => {
    const carico = carichiBozza.find(c => c.id === caricoUiId);
    if (!carico) return;

    setUpdating(true);

    try {
      if (carico.is_ordine_singolo) {
        // È un ordine singolo → aggiorna l'ordine
        await ordiniApi.aggiorna(carico.ordine_id, { [field]: value || null });
      } else {
        // È un carico → aggiorna il carico
        await carichiApi.aggiorna(carico.carico_id, { [field]: value || null });
      }

      // Aggiorna state locale per feedback immediato
      setCarichiBozza(prev => prev.map(c =>
        c.id === caricoUiId ? { ...c, [field]: value } : c
      ));

    } catch (error) {
      console.error('Errore aggiornamento:', error);
      mostraErrore('Errore durante il salvataggio');
    } finally {
      setUpdating(false);
    }
  };

  // ============================================
  // AGGIORNA ORDINE DIRETTO (>= 280q)
  // ============================================
  const handleUpdateOrdineDiretto = async (ordineId, field, value) => {
    setUpdating(true);

    try {
      await ordiniApi.aggiorna(ordineId, { [field]: value || null });
      setOrdiniGrandi(prev => prev.map(o =>
        o.id === ordineId ? { ...o, [field]: value } : o
      ));
    } catch (error) {
      console.error('Errore aggiornamento:', error);
      mostraErrore('Errore durante il salvataggio');
    } finally {
      setUpdating(false);
    }
  };

  // ============================================
  // ASSEGNA TRASPORTO A CARICO (passa a ASSEGNATO)
  // ============================================
  const assegnaCarico = async (caricoUiId) => {
    const carico = carichiBozza.find(c => c.id === caricoUiId);
    if (!carico || carico.is_ordine_singolo) return;

    if (!carico.trasportatore_id || !carico.data_ritiro) {
      return mostraErrore('Inserisci trasportatore e data ritiro');
    }

    const totale = carico.ordini.reduce(
      (sum, o) => sum + parseFloat(o.totale_quintali || 0), 0
    );
    if (totale < 280) {
      return mostraErrore(`Carico incompleto: ${totale.toFixed(0)}q < 280q`);
    }

    setUpdating(true);

    try {
      await carichiApi.assegna(carico.carico_id, {
        trasportatore_id: parseInt(carico.trasportatore_id),
        data_ritiro: carico.data_ritiro
      });
      mostraSuccesso('Carico assegnato al trasportatore');
      await caricaDati();
    } catch (error) {
      console.error('Errore assegnazione:', error);
      mostraErrore(error.response?.data?.detail || 'Errore durante l\'assegnazione');
    } finally {
      setUpdating(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <DateHeader />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-black">Planner</h1>
          <p className="text-slate-500 text-sm mt-1">
             in attesa · ritirati
          </p>
        </div>
        <Link
          to="/ordini/nuovo"
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-black transition-colors"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nuovo</span>
        </Link>
      </div>

      {/* Filtro Mulini */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setFiltroMulini([])}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${filtroMulini.length === 0
            ? 'bg-slate-900 text-white'
            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
        >
          <Factory size={16} />
          Tutti i mulini
        </button>
        <div className="w-px h-8 bg-slate-500 flex-shrink-0" />
        {mulini.map(m => (
          <button
            key={m.id}
            onClick={() => setFiltroMulini(prev =>
              prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
            )}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filtroMulini.includes(m.id)
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            {m.nome}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* SEZIONE 1: Accoppiamento Ordini (<280q) */}
          <div className="mb-12">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
              Gestione Ordini
            </h2>

            {carichiFiltrati.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                <Package className="mx-auto text-slate-300 mb-3" size={40} />
                <p className="text-slate-500">Nessun ordine da accoppiare</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
                <DndContext
                  collisionDetection={closestCenter}
                  onDragStart={(event) => setActiveId(event.active.id)}
                  onDragEnd={(event) => {
                    setActiveId(null);
                    handleDragEnd(event);
                  }}
                  onDragCancel={() => setActiveId(null)}
                >
                  <table className="w-full bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-2 w-10"></th>
                        <th className="px-4 py-2 w-20">ID</th>
                        <th className="px-4 py-2 w-24">Data</th>
                        <th className="px-4 py-2">Mulino</th>
                        <th className="px-4 py-2">Cliente</th>
                        <th className="px-4 py-2 text-right">Quintali</th>
                        <th className="px-4 py-2 text-center w-10">Tipo</th>
                        <th className="px-4 py-2 text-center">Data Ritiro</th>
                        <th className="px-4 py-2 text-center">Trasportatore</th>
                        <th className="px-4 py-2 text-center w-20">Stato</th>
                      </tr>
                    </thead>
                    <SortableContext
                      items={carichiFiltrati.map(c => c.id)}
                      strategy={() => null}  // STRATEGIA NULLA = niente movimento
                    >
                      <tbody className="divide-y divide-slate-50">
                        {carichiFiltrati.map(c => (
                          <SortableCaricoRow
                            key={c.id}
                            carico={c}
                            trasportatori={trasportatori}
                            onSepara={separaOrdine}
                            onDataChange={(id, val) => handleUpdateCaricoField(id, 'data_ritiro', val)}
                            onTraspChange={(id, val) => handleUpdateCaricoField(id, 'trasportatore_id', val)}
                            isUpdating={updating}
                            activeId={activeId}  // AGGIUNGI QUESTO
                          />
                        ))}
                      </tbody>
                    </SortableContext>
                  </table>
                </DndContext>
              </div>
            )}
          </div>

          {/* SEZIONE 2: Carichi Diretti (>=280q) */}
          <div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
              Ordini completi
            </h2>

            {ordiniGrandi.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                <Truck className="mx-auto text-slate-300 mb-3" size={40} />
                <p className="text-slate-500">Nessun ordine diretto</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-2 w-20">ID</th>
                      <th className="px-4 py-2 w-24">Data</th>
                      <th className="px-4 py-2">Mulino</th>
                      <th className="px-4 py-2">Cliente</th>
                      <th className="px-4 py-2 text-right">Quintali</th>
                      <th className="px-4 py-2 text-center w-10">Tipo</th>
                      <th className="px-4 py-2 text-center">Data Ritiro</th>
                      <th className="px-4 py-2 text-center">Trasportatore</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ordiniGrandi.map(o => {
                      const mulinoNome = o.righe?.[0]?.mulino_nome ||
                        mulini.find(m => m.id === o.righe?.[0]?.mulino_id)?.nome || 'N/D';

                      return (
                        <tr key={o.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-400">#{o.id}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {o.data_ordine ? new Date(o.data_ordine).toLocaleDateString('it-IT') : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{mulinoNome}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{o.cliente_nome}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">
                            {parseFloat(o.totale_quintali || 0).toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase ${o.tipo_ordine === 'pedane'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                              }`}>
                              {o.tipo_ordine === 'pedane' ? 'P' : 'S'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="date"
                              value={o.data_ritiro || ''}
                              onChange={(e) => handleUpdateOrdineDiretto(o.id, 'data_ritiro', e.target.value)}
                              className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none bg-white"
                              disabled={updating}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <select
                              value={o.trasportatore_id || ''}
                              onChange={(e) => handleUpdateOrdineDiretto(o.id, 'trasportatore_id', e.target.value)}
                              className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none bg-white w-36"
                              disabled={updating}
                            >
                              <option value="">-</option>
                              {trasportatori.map(t => (
                                <option key={t.id} value={t.id}>{t.nome}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
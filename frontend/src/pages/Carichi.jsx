import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Factory, Unlink, AlertCircle, GripVertical, Loader2, Check, Truck, Package } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';
import { ordiniApi, trasportatoriApi, muliniApi, carichiApi } from '@/lib/api';
import DateHeader from '@/components/DateHeader';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

// ============================================
// COMPONENTE RIGA CARICO DRAGGABLE (CORRETTA)
// ============================================
function SortableCaricoRow({
  carico,
  onSepara,
  onDataChange,
  onTraspChange,
  trasportatori,
  isUpdating,
  activeId,
  ordiniEspansi,
  onToggleEspansione
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: carico.id });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: carico.id,
  });

  const setNodeRef = (node) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

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


  const rowClasses = `
    transition-all duration-200 ease-out
    ${isDragging ? 'bg-blue-50 scale-[0.98] shadow-lg' : 'hover:bg-slate-50/50'}
    ${showDropHighlight ? 'bg-gray-50 ring-2 ring-gray-400 ring-inset scale-[1.03]' : ''}
  `;

  const expandedCount = carico.ordini.filter(o => ordiniEspansi.includes(o.id)).length;
  const totalRowSpan = carico.ordini.length + expandedCount;

  return (
    <>
      {carico.ordini.map((o, idx) => (
        <React.Fragment key={o.id}>
          <tr
            ref={idx === 0 ? setNodeRef : null}
            style={idx === 0 ? style : {}}
            className={`${rowClasses} ${idx === 0 ? 'border-t border-slate-100' : ''} cursor-pointer`}
            onClick={() => onToggleEspansione(o.id)}
          >
            <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
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

            <td className="px-4 py-3 text-sm font-medium text-slate-400">#{o.id}</td>

            <td className="px-4 py-3 text-sm text-slate-500">
              {o.data_ordine ? new Date(o.data_ordine).toLocaleDateString('it-IT') : '-'}
            </td>

            <td className="px-4 py-3 text-sm text-slate-600">{carico.mulino_nome}</td>

            <td className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{o.cliente_nome}</span>
                {carico.ordini.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSepara(carico.id, o.id); }}
                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                    title="Separa ordine dal carico"
                    disabled={isUpdating}
                  >
                    <Unlink size={14} />
                  </button>
                )}
              </div>
            </td>

            <td className="px-4 py-3 text-right font-bold text-slate-700">
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

            {idx === 0 && (
              <>
                <td
                  rowSpan={totalRowSpan}
                  className="px-4 py-3 text-center align-middle bg-slate-50/30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative inline-block group">
                    <input
                      type="date"
                      value={carico.data_ritiro || ''}
                      onChange={(e) => onDataChange(carico.id, e.target.value)}
                      className="px-2 py-1.5 pr-8 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 appearance-none"
                      disabled={isUpdating}
                    />
                    {carico.data_ritiro && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDataChange(carico.id, null);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors z-10"
                        title="Rimuovi data"
                      >
                        <Plus size={16} className="rotate-45" />
                      </button>
                    )}
                  </div>
                </td>
                <td
                  rowSpan={totalRowSpan}
                  className="px-4 py-3 text-center align-middle bg-slate-50/30"
                  onClick={(e) => e.stopPropagation()}
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
                <td
                  rowSpan={totalRowSpan}
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

          {ordiniEspansi.includes(o.id) && o.righe && o.righe.length > 0 && (
            <tr className="bg-slate-50">
              <td colSpan={7} className="px-4 py-3">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Pedane</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Prodotto</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Tipologia</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">€/q</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Quintali</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {o.righe.map((riga) => (
                        <tr key={riga.id} className="text-sm">
                          <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                            {o.tipo_ordine === 'sfuso' ? '-' : parseInt(riga.pedane || 0)}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-slate-900">{riga.prodotto_nome || '-'}</td>
                          <td className="px-4 py-2.5 text-slate-600">
                            {riga.prodotto_tipologia ? (
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${riga.prodotto_tipologia === '00'
                                ? 'bg-amber-100 text-amber-700'
                                : riga.prodotto_tipologia === '0'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-slate-100 text-slate-600'
                                }`}>
                                {riga.prodotto_tipologia}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-600">
                            {riga.prezzo_quintale ? `€${parseFloat(riga.prezzo_quintale).toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                            {parseFloat(riga.quintali || 0).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

// ============================================
// COMPONENTE PRINCIPALE
// ============================================
// Calcola lunedì e domenica della settimana corrente (formato YYYY-MM-DD)
function getSettimanaCorrente() {
  const oggi = new Date();
  const giorno = oggi.getDay(); // 0=dom, 1=lun, ...
  const diffLun = giorno === 0 ? -6 : 1 - giorno;
  const lunedi = new Date(oggi);
  lunedi.setDate(oggi.getDate() + diffLun);
  const domenica = new Date(lunedi);
  domenica.setDate(lunedi.getDate() + 6);
  const fmt = (d) => d.toISOString().split('T')[0];
  return { da: fmt(lunedi), a: fmt(domenica) };
}

export default function Carichi() {
  const [carichiBozza, setCarichiBozza] = useState([]);
  const [carichiAssegnati, setCarichiAssegnati] = useState([]);

  const [activeId, setActiveId] = useState(null);
  const [trasportatori, setTrasportatori] = useState([]);
  const [mulini, setMulini] = useState([]);
  const [filtroMulini, setFiltroMulini] = useState([]);

  const [filtroDataDa, setFiltroDataDa] = useState(() => getSettimanaCorrente().da);
  const [filtroDataA, setFiltroDataA] = useState(() => getSettimanaCorrente().a);

  const [ordiniEspansi, setOrdiniEspansi] = useState([]);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errore, setErrore] = useState('');
  const [successo, setSuccesso] = useState('');

  useEffect(() => {
    caricaDati();
  }, []);

  const caricaDati = async () => {
    try {
      setLoading(true);
      const [ordRes, traspRes, mulRes, carichiRes] = await Promise.all([
        ordiniApi.lista(),
        trasportatoriApi.lista(),
        muliniApi.lista(),
        carichiApi.lista({ stato: 'bozza' }),
      ]);

      setTrasportatori(traspRes.data);
      setMulini(mulRes.data);

      // Tutti gli ordini non ritirati (nessun filtro data qui)
      const ordiniValidi = ordRes.data.filter(o => o.stato !== 'ritirato');

      const ordiniNonInCarico = ordiniValidi.filter(o => !o.carico_id);

      const ordiniMappati = ordiniNonInCarico.map(o => {
        const mulinoId = o.righe?.[0]?.mulino_id;
        const mulinoNome = o.righe?.[0]?.mulino_nome ||
          mulRes.data.find(m => m.id === mulinoId)?.nome || 'N/D';
        return {
          id: `ordine-${o.id}`,
          ordine_id: o.id,
          is_ordine_singolo: true,
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
            righe: o.righe,
          }]
        };
      });

      const carichiEsistenti = carichiRes.data.map(c => {
        const ordiniCarico = ordiniValidi.filter(o => o.carico_id === c.id);
        const mulinoNome = mulRes.data.find(m => m.id === c.mulino_id)?.nome || 'N/D';
        return {
          id: `carico-${c.id}`,
          carico_id: c.id,
          is_ordine_singolo: false,
          mulino_id: c.mulino_id,
          mulino_nome: mulinoNome,
          tipo_ordine: c.tipo,
          data_ritiro: c.data_ritiro,
          trasportatore_id: c.trasportatore_id,
          ordini: ordiniCarico.map(o => ({
            id: o.id,
            cliente_nome: o.cliente_nome,
            data_ordine: o.data_ordine,
            data_ritiro: o.data_ritiro,
            tipo_ordine: o.tipo_ordine,
            totale_quintali: o.totale_quintali,
            righe: o.righe,
          }))
        };
      });

      const tutti = [...carichiEsistenti, ...ordiniMappati];
      setCarichiBozza(tutti.filter(c => !c.data_ritiro || !c.trasportatore_id));
      setCarichiAssegnati(tutti.filter(c => c.data_ritiro && c.trasportatore_id));

    } catch (error) {
      console.error('Errore caricamento:', error);
      setErrore('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const mostraErrore = (msg) => {
    setErrore(msg);
    setTimeout(() => setErrore(''), 4000);
  };

  const toggleEspansione = (ordineId) => {
    setOrdiniEspansi(prev =>
      prev.includes(ordineId)
        ? prev.filter(x => x !== ordineId)
        : [...prev, ordineId]
    );
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const source = carichiBozza.find(c => c.id === active.id);
    const target = carichiBozza.find(c => c.id === over.id);

    if (!source || !target) return;
    if (source.mulino_id !== target.mulino_id) return mostraErrore("Mulini diversi");
    if (source.tipo_ordine !== target.tipo_ordine) return mostraErrore("Tipi diversi");

    const pesoTotale = [...source.ordini, ...target.ordini]
      .reduce((s, o) => s + parseFloat(o.totale_quintali || 0), 0);

    if (pesoTotale > 300) return mostraErrore(`Peso eccessivo: ${pesoTotale.toFixed(1)}q`);

    setUpdating(true);
    try {
      // Raccogli tutti gli ordini coinvolti nel merge
      const tuttiOrdini = [...source.ordini, ...target.ordini];

      if (!target.is_ordine_singolo && target.carico_id) {
        for (const ordine of source.ordini) {
          await carichiApi.aggiungiOrdine(target.carico_id, ordine.id);
        }
      } else {
        const ordiniIds = tuttiOrdini.map(o => o.id);
        await carichiApi.creaBozza({ ordini_ids: ordiniIds });
      }

      // Pulisci data_ritiro e trasportatore_id dai singoli ordini
      // (ora gestiti a livello carico)
      await Promise.all(tuttiOrdini.map(o =>
        ordiniApi.aggiorna(o.id, { data_ritiro: null, trasportatore_id: null })
      ));

      await caricaDati();
    } catch (error) {
      mostraErrore('Errore durante l\'unione');
    } finally {
      setUpdating(false);
    }
  };

  const separaOrdine = async (caricoUiId, ordineId) => {
    const carico = carichiBozza.find(c => c.id === caricoUiId);
    if (!carico || carico.is_ordine_singolo) return;
    setUpdating(true);
    try {
      await carichiApi.rimuoviOrdine(carico.carico_id, ordineId);
      await caricaDati();
    } catch (error) {
      mostraErrore('Errore durante la separazione');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateField = async (caricoUiId, field, value) => {
    const carico = [...carichiBozza, ...carichiAssegnati].find(c => c.id === caricoUiId);
    if (!carico) return;

    // Validazione: data_ritiro non può essere antecedente alla data_ordine
    if (field === 'data_ritiro' && value) {
      const dataRitiro = value.split('T')[0];
      const minDataOrdine = carico.ordini
        .map(o => o.data_ordine?.split('T')[0])
        .filter(Boolean)
        .sort()
        .pop();
      if (minDataOrdine && dataRitiro < minDataOrdine) {
        mostraErrore(`La data di ritiro non può essere precedente alla data ordine (${new Date(minDataOrdine).toLocaleDateString('it-IT')})`);
        return;
      }
    }

    setUpdating(true);
    try {
      if (carico.is_ordine_singolo) {
        await ordiniApi.aggiorna(carico.ordine_id, { [field]: value || null });
      } else {
        await carichiApi.aggiorna(carico.carico_id, { [field]: value || null });
        const updatePromises = carico.ordini.map(o =>
          ordiniApi.aggiorna(o.id, { [field]: value || null })
        );
        await Promise.all(updatePromises);
      }
      await caricaDati();
    } catch (error) {
      console.error('Errore sincronizzazione:', error);
      mostraErrore('Errore durante il salvataggio');
    } finally {
      setUpdating(false);
    }
  };

  const carichiBozzaFiltrati = carichiBozza.filter(c =>
    filtroMulini.length === 0 || filtroMulini.includes(c.mulino_id)
  );

  const carichiAssegnatiFiltrati = carichiAssegnati.filter(c => {
    if (filtroMulini.length > 0 && !filtroMulini.includes(c.mulino_id)) return false;
    if (!c.data_ritiro) return true;
    const dr = c.data_ritiro.split('T')[0];
    return dr >= filtroDataDa && dr <= filtroDataA;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <DateHeader />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-black">Planner</h1>
          <p className="text-slate-500 text-sm mt-1">
            {carichiBozza.length} da gestire · {carichiAssegnati.length} assegnati
          </p>
        </div>
        <Link to="/ordini/nuovo" className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-black transition-colors">
          <Plus size={18} />
          <span className="hidden sm:inline">Nuovo ordine</span>
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <div className="flex items-center gap-2 flex-shrink-0">
          <label className="text-xs font-bold text-slate-500 uppercase">Da</label>
          <input
            type="date"
            value={filtroDataDa}
            onChange={(e) => setFiltroDataDa(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <label className="text-xs font-bold text-slate-500 uppercase">A</label>
          <input
            type="date"
            value={filtroDataA}
            onChange={(e) => setFiltroDataA(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div className="w-px h-8 bg-slate-300 flex-shrink-0" />
        <button onClick={() => setFiltroMulini([])} className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${filtroMulini.length === 0 ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
          <Factory size={16} /> Tutti i mulini
        </button>
        {mulini.map(m => (
          <button key={m.id} onClick={() => setFiltroMulini(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}
            className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors ${filtroMulini.includes(m.id) ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {m.nome}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4 ml-1">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Ordini da pianificare</h2>
              {errore && (
                <span className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2.5 py-1 rounded-lg animate-pulse">
                  <AlertCircle size={12} />
                  {errore}
                </span>
              )}
            </div>
            <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
              <DndContext collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={(e) => { setActiveId(null); handleDragEnd(e); }} onDragCancel={() => setActiveId(null)}>
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-2 w-10"></th>
                      <th className="px-4 py-2 w-20">ID</th>
                      <th className="px-4 py-2 w-24">Inserimento</th>
                      <th className="px-4 py-2">Mulino</th>
                      <th className="px-4 py-2">Cliente</th>
                      <th className="px-4 py-2 text-right">Q.li</th>
                      <th className="px-4 py-2 text-center w-10">Tipo</th>
                      <th className="px-4 py-2 text-center">Ritiro</th>
                      <th className="px-4 py-2 text-center">Trasp.</th>
                      <th className="px-4 py-2 text-center w-20">Stato</th>
                    </tr>
                  </thead>
                  <SortableContext items={carichiBozzaFiltrati.map(c => c.id)} strategy={() => null}>
                    <tbody>
                      {carichiBozzaFiltrati.map(c => (
                        <SortableCaricoRow
                          key={c.id}
                          carico={c}
                          trasportatori={trasportatori}
                          onSepara={separaOrdine}
                          onDataChange={(id, val) => handleUpdateField(id, 'data_ritiro', val)}
                          onTraspChange={(id, val) => handleUpdateField(id, 'trasportatore_id', val)}
                          isUpdating={updating}
                          activeId={activeId}
                          ordiniEspansi={ordiniEspansi}
                          onToggleEspansione={toggleEspansione}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Ordini Assegnati</h2>
            <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 w-10"></th>
                    <th className="px-4 py-2 w-20">ID</th>
                    <th className="px-4 py-2 w-24">Inserimento</th>
                    <th className="px-4 py-2">Mulino</th>
                    <th className="px-4 py-2">Cliente</th>
                    <th className="px-4 py-2 text-right">Q.li</th>
                    <th className="px-4 py-2 text-center w-10">Tipo</th>
                    <th className="px-4 py-2 text-center">Ritiro</th>
                    <th className="px-4 py-2 text-center">Trasp.</th>
                    <th className="px-4 py-2 text-center w-20">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {carichiAssegnatiFiltrati.map(c => {
                    const expCount = c.ordini.filter(o => ordiniEspansi.includes(o.id)).length;
                    const assRowSpan = c.ordini.length + expCount;
                    return (
                      <React.Fragment key={c.id}>
                        {c.ordini.map((o, idx) => (
                          <React.Fragment key={o.id}>
                            <tr className={`hover:bg-slate-50/50 cursor-pointer ${idx === 0 ? 'border-t border-slate-100' : ''}`} onClick={() => toggleEspansione(o.id)}>
                              <td className="px-4 py-3"></td>
                              <td className="px-4 py-3 text-sm font-medium text-slate-400">#{o.id}</td>
                              <td className="px-4 py-3 text-sm text-slate-500">{new Date(o.data_ordine).toLocaleDateString('it-IT')}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{c.mulino_nome}</td>
                              <td className="px-4 py-3 font-semibold text-slate-900">{o.cliente_nome}</td>
                              <td className="px-4 py-3 text-right font-bold text-slate-700">{parseFloat(o.totale_quintali).toFixed(1)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase ${o.tipo_ordine === 'pedane' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                  {o.tipo_ordine === 'pedane' ? 'P' : 'S'}
                                </span>
                              </td>
                              {idx === 0 && (
                                <>
                                  <td rowSpan={assRowSpan} className="px-4 py-3 text-center align-middle bg-green-50/20" onClick={(e) => e.stopPropagation()}>
                                    <div className="relative inline-block">
                                      <input
                                        type="date"
                                        value={c.data_ritiro || ''}
                                        onChange={(e) => handleUpdateField(c.id, 'data_ritiro', e.target.value)}
                                        className="px-2 py-1.5 pr-7 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 appearance-none"
                                        disabled={updating}
                                      />
                                      {c.data_ritiro && (
                                        <button
                                          onClick={() => handleUpdateField(c.id, 'data_ritiro', null)}
                                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                          <Plus size={14} className="rotate-45" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td rowSpan={assRowSpan} className="px-4 py-3 text-center bg-green-50/20" onClick={(e) => e.stopPropagation()}>
                                    <select value={c.trasportatore_id || ''} onChange={(e) => handleUpdateField(c.id, 'trasportatore_id', e.target.value)} className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none w-36">
                                      <option value="">-</option>
                                      {trasportatori.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                    </select>
                                  </td>
                                  <td rowSpan={assRowSpan} className="px-4 py-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className={`text-sm font-bold ${c.ordini.reduce((sum, o) => sum + parseFloat(o.totale_quintali || 0), 0) >= 280
                                        ? 'text-green-600'
                                        : 'text-amber-500'
                                        }`}>
                                        {c.ordini.reduce((sum, o) => sum + parseFloat(o.totale_quintali || 0), 0).toFixed(0)}q
                                        {c.ordini.reduce((sum, o) => sum + parseFloat(o.totale_quintali || 0), 0) >= 280 && (
                                          <span className="block text-[10px] uppercase font-black">(Pronto)</span>
                                        )}
                                      </span>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                            {ordiniEspansi.includes(o.id) && o.righe && o.righe.length > 0 && (
                              <tr className="bg-slate-50">
                                <td colSpan={7} className="px-4 py-3">
                                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                    <table className="w-full">
                                      <thead className="bg-slate-100">
                                        <tr>
                                          <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Pedane</th>
                                          <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Prodotto</th>
                                          <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Tipologia</th>
                                          <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">€/q</th>
                                          <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Quintali</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {o.righe.map((riga) => (
                                          <tr key={riga.id} className="text-sm">
                                            <td className="px-4 py-2.5 text-right font-medium text-slate-900">{o.tipo_ordine === 'sfuso' ? '-' : parseInt(riga.pedane || 0)}</td>
                                            <td className="px-4 py-2.5 font-medium text-slate-900">{riga.prodotto_nome || '-'}</td>
                                            <td className="px-4 py-2.5 text-slate-600">
                                              {riga.prodotto_tipologia ? (
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${riga.prodotto_tipologia === '00'
                                                  ? 'bg-amber-100 text-amber-700'
                                                  : riga.prodotto_tipologia === '0'
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : 'bg-slate-100 text-slate-600'
                                                  }`}>
                                                  {riga.prodotto_tipologia}
                                                </span>
                                              ) : '-'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-slate-600">{riga.prezzo_quintale ? `€${parseFloat(riga.prezzo_quintale).toFixed(2)}` : '-'}</td>

                                            <td className="px-4 py-2.5 text-right font-medium text-slate-900">{parseFloat(riga.quintali || 0).toFixed(1)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
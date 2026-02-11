import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Factory, Unlink, AlertCircle, GripVertical } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ordiniApi, trasportatoriApi, muliniApi } from '@/lib/api';
import DateHeader from '@/components/DateHeader';

// Componente Riga/Carico Aggregato con lo stile della tabella Ordini
function SortableCaricoRow({ carico, onSepara, onDataChange, onTraspChange, trasportatori }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: carico.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 'auto' };
  const isCompleto = carico.data_ritiro && carico.trasportatore_id;

  return (
    <>
      {carico.ordini.map((o, idx) => (
        <tr key={o.id} ref={idx === 0 ? setNodeRef : null} style={idx === 0 ? style : {}}>
          <td className="px-4 py-3 align-middle">
            {idx === 0 && (
              <div {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-slate-600">
                <GripVertical size={20} />
              </div>
            )}
          </td>
          <td className="px-4 py-3 text-sm font-medium text-slate-400">#{o.id}</td>
          <td className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">{o.cliente_nome}</span>
              {carico.ordini.length > 1 && (
                <button onClick={() => onSepara(carico.id, o.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors" title="Separa ordine">
                  <Unlink size={14} />
                </button>
              )}
            </div>
          </td>
          <td className="px-4 py-3 text-sm text-slate-600">{carico.mulino_nome}</td>
          <td className="px-4 py-3 text-right font-bold text-slate-700">{parseFloat(o.totale_quintali || 0).toFixed(1)}</td>
          <td className="px-4 py-3 text-center">
            <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase ${o.tipo_ordine === 'pedane' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
              {o.tipo_ordine === 'pedane' ? 'P' : 'S'}
            </span>
          </td>
          {idx === 0 && (
            <>
              <td rowSpan={carico.ordini.length} className="px-4 py-3 text-center align-middle bg-slate-50/30">
                <input type="date" value={carico.data_ritiro || ''} onChange={(e) => onDataChange(carico.id, e.target.value)} className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none bg-white" />
              </td>
              <td rowSpan={carico.ordini.length} className="px-4 py-3 text-center align-middle bg-slate-50/30">
                <select value={carico.trasportatore_id || ''} onChange={(e) => onTraspChange(carico.id, e.target.value)} className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none bg-white w-36">
                  <option value="">-</option>
                  {trasportatori.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </td>
            </>
          )}
        </tr>
      ))}
      {carico.ordini.length > 1 && (
        <tr className="bg-slate-50/50">
          <td colSpan={4} className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase text-right">Totale Carico:</td>
          <td className="px-4 py-1 text-right font-black text-slate-900">{carico.ordini.reduce((sum, o) => sum + parseFloat(o.totale_quintali), 0).toFixed(1)}q</td>
          <td colSpan={3}></td>
        </tr>
      )}
    </>
  );
}

export default function Carichi() {
  const [carichiPiccoli, setCarichiPiccoli] = useState([]);
  const [ordiniGrandi, setOrdiniGrandi] = useState([]);
  const [trasportatori, setTrasportatori] = useState([]);
  const [mulini, setMulini] = useState([]);
  const [filtroMulini, setFiltroMulini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    caricaDati();
  }, []);

  const caricaDati = async () => {
    try {
      setLoading(true);
      const [ordRes, traspRes, mulRes] = await Promise.all([
        ordiniApi.lista(),
        trasportatoriApi.lista(),
        muliniApi.lista(),
      ]);

      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);

      const tuttiOrdini = ordRes.data.filter(o => {
        if (!o.data_ritiro) return true;
        return new Date(o.data_ritiro) >= oggi;
      });

      setOrdiniGrandi(tuttiOrdini.filter(o => o.totale_quintali >= 280));

      const piccoliIniziali = tuttiOrdini
        .filter(o => o.totale_quintali < 280)
        .map(o => ({
          id: `group-${o.id}`,
          mulino_id: o.righe?.[0]?.mulino_id,
          mulino_nome: o.mulino_nome || 'Mulino',
          tipo_ordine: o.tipo_ordine,
          data_ritiro: o.data_ritiro,
          trasportatore_id: o.trasportatore_id,
          ordini: [o]
        }));

      setCarichiPiccoli(piccoliIniziali);
      setTrasportatori(traspRes.data);
      setMulini(mulRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const source = carichiPiccoli.find(c => c.id === active.id);
    const target = carichiPiccoli.find(c => c.id === over.id);

    if (source.mulino_id !== target.mulino_id) return mostraErrore("Mulini diversi");
    if (source.tipo_ordine !== target.tipo_ordine) return mostraErrore("Tipo diverso (Sfuso/Pedane)");

    const pesoTotale = [...source.ordini, ...target.ordini].reduce((s, o) => s + parseFloat(o.totale_quintali), 0);
    if (pesoTotale > 300) return mostraErrore(`Peso eccessivo (${pesoTotale.toFixed(1)}q)`);

    setCarichiPiccoli(prev => {
      const nuovi = prev.filter(c => c.id !== active.id);
      return nuovi.map(c => {
        if (c.id === over.id) {
          return {
            ...c,
            ordini: [...c.ordini, ...source.ordini],
            data_ritiro: c.data_ritiro || source.data_ritiro,
            trasportatore_id: c.trasportatore_id || source.trasportatore_id
          };
        }
        return c;
      });
    });
  };

  const separaOrdine = (caricoId, ordineId) => {
    setCarichiPiccoli(prev => {
      const caricoPadre = prev.find(c => c.id === caricoId);
      const ordineDaEstrarre = caricoPadre.ordini.find(o => o.id === ordineId);
      const rimanenti = caricoPadre.ordini.filter(o => o.id !== ordineId);
      const nuovoSingolo = {
        id: `group-${ordineDaEstrarre.id}`,
        mulino_id: caricoPadre.mulino_id,
        mulino_nome: caricoPadre.mulino_nome,
        tipo_ordine: caricoPadre.tipo_ordine,
        ordini: [ordineDaEstrarre]
      };
      return [...prev.map(c => c.id === caricoId ? { ...c, ordini: rimanenti } : c), nuovoSingolo];
    });
  };

  const mostraErrore = (msg) => {
    setErrore(msg);
    setTimeout(() => setErrore(''), 3000);
  };

  const carichiFiltrati = carichiPiccoli.filter(c =>
    filtroMulini.length === 0 || filtroMulini.includes(c.mulino_id)
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <DateHeader />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Carichi</h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            Gestione carichi e accoppiamento ordini
            {errore && <span className="text-red-500 font-bold flex items-center gap-1 animate-pulse"><AlertCircle size={14} /> {errore}</span>}
          </p>
        </div>
        <Link to="/ordini/nuovo" className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-black transition-colors shadow-sm">
          <Plus size={18} /> Nuovo
        </Link>
      </div>

      {/* Filtro Mulini - Stessa UI di Ordini.jsx */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => setFiltroMulini([])}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${filtroMulini.length === 0 ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Factory size={16} /> Tutti i mulini
        </button>
        <div className="w-px h-8 bg-slate-200 flex-shrink-0 mx-1" />
        {mulini.map(m => (
          <button
            key={m.id}
            onClick={() => setFiltroMulini(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${filtroMulini.includes(m.id) ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
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
          {/* CARICHI PICCOLI AGGREGABILI */}
          <div className="mb-12">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Accoppiamento Ordini ({"<"}280q)</h2>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <table className="w-full bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-2 w-10"></th>
                    <th className="px-4 py-2 w-20">ID</th>
                    <th className="px-4 py-2">Cliente</th>
                    <th className="px-4 py-2">Mulino</th>
                    <th className="px-4 py-2 text-right">Quintali</th>
                    <th className="px-4 py-2 text-center w-10">Tipo</th>
                    <th className="px-4 py-2 text-center">Data Ritiro</th>
                    <th className="px-4 py-2 text-center">Trasportatore</th>
                  </tr>
                </thead>
                <SortableContext items={carichiFiltrati.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  <tbody className="divide-y divide-slate-50">
                    {carichiFiltrati.map(c => (
                      <SortableCaricoRow
                        key={c.id}
                        carico={c}
                        trasportatori={trasportatori}
                        onSepara={separaOrdine}
                        onDataChange={(id, val) => setCarichiPiccoli(prev => prev.map(item => item.id === id ? { ...item, data_ritiro: val } : item))}
                        onTraspChange={(id, val) => setCarichiPiccoli(prev => prev.map(item => item.id === id ? { ...item, trasportatore_id: val } : item))}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>

          </div>

          {/* CARICHI GRANDI (TABELLA IDENTICA A ORDINI) */}
          <div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Carichi Diretti (≥280q)</h2>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 w-20">ID</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Mulino</th>
                    <th className="px-4 py-3 text-right">Quintali</th>
                    <th className="px-4 py-3 text-center w-24">Tipo</th>
                    <th className="px-4 py-3 text-center">Data Ritiro</th>
                    <th className="px-4 py-3 text-center">Trasportatore</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordiniGrandi.map(o => {
                    const isCompleto = o.data_ritiro && o.trasportatore_id;
                    return (
                      <tr key={o.id} className={`hover:bg-slate-50/50 transition-colors ${isCompleto ? 'bg-emerald-50/40' : ''}`}>
                        <td className="px-4 py-4 text-sm font-medium text-slate-400">#{o.id}</td>
                        <td className="px-4 py-4 font-bold text-slate-900">{o.cliente_nome}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{o.mulino_nome}</td>
                        <td className="px-4 py-4 text-right font-black text-slate-700">
                          {parseFloat(o.totale_quintali || 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase ${o.tipo_ordine === 'pedane' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                            {o.tipo_ordine === 'pedane' ? 'P' : 'S'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <input
                            type="date"
                            value={o.data_ritiro || ''}
                            onChange={(e) => {/* update logic */ }}
                            className="px-2 py-1.5 text-sm border border-slate-100 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none bg-white"
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <select
                            value={o.trasportatore_id || ''}
                            onChange={(e) => {/* update logic */ }}
                            className="px-2 py-1.5 text-sm border border-slate-100 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none bg-white w-36"
                          >
                            <option value="">-</option>
                            {trasportatori.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                          </select>
                        </td>
                      </tr>
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
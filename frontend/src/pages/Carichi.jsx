import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, X, Factory } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableItem from '@/components/SortableItem'; // crea un componente SortableItem tr
import { ordiniApi, trasportatoriApi, muliniApi } from '@/lib/api';
import DateHeader from '@/components/DateHeader';

export default function Carichi() {
  const [ordini, setOrdini] = useState([]);
  const [trasportatori, setTrasportatori] = useState([]);
  const [mulini, setMulini] = useState([]);
  const [filtroMulini, setFiltroMulini] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setOrdini(ordRes.data);
      setTrasportatori(traspRes.data);
      setMulini(mulRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const caricoCompleto = (ordine) =>
    ordine.data_ritiro && ordine.trasportatore_id;

  const handleDataRitiroChange = async (ordineId, nuovaData) => {
    try {
      const valore = nuovaData || null;
      await ordiniApi.aggiorna(ordineId, { data_ritiro: valore });
      setOrdini((prev) =>
        prev.map((o) =>
          o.id === ordineId ? { ...o, data_ritiro: valore } : o
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleTrasportatoreChange = async (ordineId, trasportatoreId) => {
    try {
      const id = trasportatoreId ? parseInt(trasportatoreId) : null;
      await ordiniApi.aggiorna(ordineId, { trasportatore_id: id });
      const trasp = trasportatori.find((t) => t.id === id);
      setOrdini((prev) =>
        prev.map((o) =>
          o.id === ordineId
            ? { ...o, trasportatore_id: id, trasportatore_nome: trasp?.nome }
            : o
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const ordiniFiltrati = ordini
    .filter((o) => {
      if (filtroMulini.length > 0) {
        const muliniOrdine = o.righe?.map((r) => r.mulino_id) || [];
        if (!filtroMulini.some((id) => muliniOrdine.includes(id))) return false;
      }
      return true;
    })
    .filter((o) => !o.data_ritiro || new Date(o.data_ritiro) >= new Date());

  const ordiniPiccoli = ordiniFiltrati.filter(
    (o) => o.totale_quintali < 280
  );
  const ordiniGrandi = ordiniFiltrati.filter(
    (o) => o.totale_quintali >= 280
  );

  // Drag & drop per ordini <280q
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setOrdiniPiccoli((prev) => {
        const oldIndex = prev.findIndex((o) => o.id === active.id);
        const newIndex = prev.findIndex((o) => o.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const toggleFiltroMulino = (mulinoId) => {
    setFiltroMulini((prev) =>
      prev.includes(mulinoId)
        ? prev.filter((id) => id !== mulinoId)
        : [...prev, mulinoId]
    );
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('it-IT') : '-');
  const formatCurrency = (v) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
      v || 0
    );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <DateHeader />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Carichi</h1>
        <Link
          to="/ordini/nuovo"
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-black transition-colors"
        >
          <Plus size={18} /> Nuovo
        </Link>
      </div>

      {/* Filtro Mulini */}
      {mulini.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setFiltroMulini([])}
            className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
              filtroMulini.length === 0
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Factory size={16} /> Tutti i mulini
          </button>
          <div className="w-px h-8 bg-slate-200 flex-shrink-0" />
          {mulini.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleFiltroMulino(m.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors ${
                filtroMulini.includes(m.id)
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {m.nome}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p>Caricamento...</p>
      ) : (
        <>
          {/* ORDINI PICCOLI <280q - drag & drop */}
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={ordiniPiccoli.map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-6">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">ID</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Cliente</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Tipo</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Quintali</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Data Ritiro</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Trasportatore</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ordiniPiccoli.map((o) => (
                      <SortableItem key={o.id} id={o.id}>
                        <tr
                          className={`hover:bg-slate-50 cursor-grab transition-colors ${
                            caricoCompleto(o) ? 'border-2 border-emerald-500' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-sm font-medium">#{o.id}</td>
                          <td className="px-4 py-3">{o.cliente_nome}</td>
                          <td className="px-4 py-3">{o.tipo_ordine}</td>
                          <td className="px-4 py-3 text-right font-medium">{o.totale_quintali}</td>
                          <td className="px-4 py-3">
                            <input
                              type="date"
                              value={o.data_ritiro || ''}
                              onChange={(e) => handleDataRitiroChange(o.id, e.target.value)}
                              className="px-2 py-1.5 text-sm border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={o.trasportatore_id || ''}
                              onChange={(e) =>
                                handleTrasportatoreChange(o.id, e.target.value)
                              }
                              className="px-2 py-1.5 text-sm border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white w-32"
                            >
                              <option value="">-</option>
                              {trasportatori.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.nome}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      </SortableItem>
                    ))}
                  </tbody>
                </table>
              </div>
            </SortableContext>
          </DndContext>

          {/* ORDINI GRANDI >=280q */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">ID</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Cliente</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Tipo</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Quintali</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Data Ritiro</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Trasportatore</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordiniGrandi.map((o) => (
                  <tr
                    key={o.id}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                      caricoCompleto(o) ? 'border-2 border-emerald-500' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium">#{o.id}</td>
                    <td className="px-4 py-3">{o.cliente_nome}</td>
                    <td className="px-4 py-3">{o.tipo_ordine}</td>
                    <td className="px-4 py-3 text-right font-medium">{o.totale_quintali}</td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={o.data_ritiro || ''}
                        onChange={(e) => handleDataRitiroChange(o.id, e.target.value)}
                        className="px-2 py-1.5 text-sm border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={o.trasportatore_id || ''}
                        onChange={(e) => handleTrasportatoreChange(o.id, e.target.value)}
                        className="px-2 py-1.5 text-sm border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white w-32"
                      >
                        <option value="">-</option>
                        {trasportatori.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nome}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

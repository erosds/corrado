import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Calendar, Factory, ChevronDown, ChevronUp, Euro, Package, Search as ViewIcon
} from 'lucide-react';
import { pagamentiApi, muliniApi } from '@/lib/api';
import DateHeader from '@/components/DateHeader';

export default function Pagamenti() {
  const navigate = useNavigate();
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [trimestre, setTrimestre] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [mulini, setMulini] = useState([]);
  const [filtroMulino, setFiltroMulino] = useState(null); // null = tutti
  const [dati, setDati] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ordiniEspansi, setOrdiniEspansi] = useState([]);

  useEffect(() => {
    muliniApi.lista().then(res => setMulini(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    caricaDati();
  }, [anno, trimestre, filtroMulino]);

  const caricaDati = async () => {
    try {
      setLoading(true);
      setOrdiniEspansi([]);
      const { data } = await pagamentiApi.provvigioniOrdini(anno, trimestre, filtroMulino);
      setDati(data);
    } catch (error) {
      console.error('Errore caricamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEspansione = (id) => {
    setOrdiniEspansi(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value || 0);
  };

  const trimestri = [
    { value: 1, label: 'Q1 (Gen-Mar)' },
    { value: 2, label: 'Q2 (Apr-Giu)' },
    { value: 3, label: 'Q3 (Lug-Set)' },
    { value: 4, label: 'Q4 (Ott-Dic)' },
  ];

  const anni = [];
  for (let a = new Date().getFullYear(); a >= 2020; a--) {
    anni.push(a);
  }

  const formatProvvigione = (riga) => {
    if (riga.tipo_provvigione === 'percentuale') {
      return `${parseFloat(riga.valore_provvigione)}%`;
    }
    return `€${parseFloat(riga.valore_provvigione).toFixed(2)}/q`;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <DateHeader />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Pagamenti</h1>
        <p className="text-slate-500 text-sm mt-1">
          Provvigioni e report
        </p>
      </div>

      {/* Filtri Periodo */}
      <div className="flex gap-3 mb-4">
        <div className="w-32">
          <select
            value={anno}
            onChange={(e) => setAnno(parseInt(e.target.value))}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-700"
          >
            {anni.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <select
            value={trimestre}
            onChange={(e) => setTrimestre(parseInt(e.target.value))}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-700"
          >
            {trimestri.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filtro Mulini */}
      {mulini.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setFiltroMulino(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
              filtroMulino === null
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Factory size={16} />
            Tutti i mulini
          </button>
          <div className="w-px h-8 bg-slate-200 flex-shrink-0" />
          {mulini.map(mulino => (
            <button
              key={mulino.id}
              onClick={() => setFiltroMulino(mulino.id === filtroMulino ? null : mulino.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors ${
                filtroMulino === mulino.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {mulino.nome}
            </button>
          ))}
        </div>
      )}

      {/* Box Riepilogo */}
      {!loading && dati && (
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3 text-emerald-200">
            <Calendar size={16} />
            <span className="text-sm font-medium">
              {trimestri.find(t => t.value === trimestre)?.label} {anno}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-emerald-200 text-xs uppercase tracking-wider">Provvigioni</p>
              <p className="text-2xl md:text-3xl font-black">
                {formatCurrency(dati.totale_provvigioni)}
              </p>
            </div>
            <div>
              <p className="text-emerald-200 text-xs uppercase tracking-wider">{filtroMulino === null ? 'Incassi Mulini' : 'Incasso Mulino'}</p>
              <p className="text-xl md:text-2xl font-bold">
                {formatCurrency(dati.totale_incassato)}
              </p>
            </div>
            <div>
              <p className="text-emerald-200 text-xs uppercase tracking-wider">Quintali</p>
              <p className="text-xl md:text-2xl font-bold">
                {parseFloat(dati.totale_quintali).toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabella Ordini */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : !dati || dati.ordini.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500">Nessun ordine con incasso in questo periodo</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Cliente</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Data Ordine</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Data Ritiro</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Data Pagamento</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">Tipo</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Quintali</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Importo</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Provvigione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dati.ordini.map((ordine) => (
                    <React.Fragment key={ordine.id}>
                      <tr
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${ordiniEspansi.includes(ordine.id) ? 'bg-slate-50' : ''}`}
                        onClick={() => toggleEspansione(ordine.id)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{ordine.cliente_nome}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(ordine.data_ordine)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(ordine.data_ritiro)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(ordine.data_incasso_mulino)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${
                            ordine.tipo_ordine === 'pedane'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {ordine.tipo_ordine === 'pedane' ? 'P' : 'S'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {parseFloat(ordine.totale_quintali || 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {formatCurrency(ordine.totale_importo)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">
                          {formatCurrency(ordine.totale_provvigione)}
                        </td>
                      </tr>

                      {/* Sotto-tabella righe */}
                      {ordiniEspansi.includes(ordine.id) && ordine.righe.length > 0 && (
                        <tr className="bg-slate-50">
                          <td colSpan={9} className="px-4 py-3">
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                              <table className="w-full">
                                <thead className="bg-slate-100">
                                  <tr>
                                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Pedane</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Prodotto</th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Tipologia</th>
                                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Quintali</th>
                                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">€/q</th>
                                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Totale</th>
                                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Provv.</th>
                                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Tot. Provv.</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {ordine.righe.map((riga) => (
                                    <tr key={riga.id} className="text-sm">
                                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                                        {ordine.tipo_ordine === 'sfuso' ? '-' : parseInt(riga.pedane || 0)}
                                      </td>
                                      <td className="px-4 py-2.5 font-medium text-slate-900">
                                        {riga.prodotto_nome || '-'}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-600">
                                        {riga.prodotto_tipologia ? (
                                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                                            riga.prodotto_tipologia === '00'
                                              ? 'bg-amber-100 text-amber-700'
                                              : riga.prodotto_tipologia === '0'
                                                ? 'bg-orange-100 text-orange-700'
                                                : 'bg-slate-100 text-slate-600'
                                          }`}>
                                            {riga.prodotto_tipologia}
                                          </span>
                                        ) : '-'}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                                        {parseFloat(riga.quintali || 0).toFixed(1)}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-slate-600">
                                        {riga.prezzo_quintale ? `€${parseFloat(riga.prezzo_quintale).toFixed(2)}` : '-'}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                                        {riga.prezzo_totale ? `€${parseFloat(riga.prezzo_totale).toFixed(2)}` : '-'}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-slate-500">
                                        {formatProvvigione(riga)}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                                        {formatCurrency(riga.provvigione_calcolata)}
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
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {dati.ordini.map((ordine) => (
              <div key={ordine.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="p-4" onClick={() => toggleEspansione(ordine.id)}>
                  {/* Riga 1: Cliente + Tipo */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate text-lg">
                        {ordine.cliente_nome}
                      </h3>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-lg text-xs font-bold ${
                        ordine.tipo_ordine === 'pedane'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {ordine.tipo_ordine === 'pedane' ? 'P' : 'S'}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/ordini/${ordine.id}`); }}
                      className="p-2 text-slate-400"
                    >
                      <ViewIcon size={20} />
                    </button>
                  </div>

                  {/* Riga 2: Quantità e Provvigione */}
                  <div className="flex items-baseline gap-4 mb-3 pb-3 border-b border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Quintali</span>
                      <span className="text-lg font-black text-slate-900">
                        {parseFloat(ordine.totale_quintali || 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Importo</span>
                      <span className="text-lg font-black text-slate-900">
                        {formatCurrency(ordine.totale_importo)}
                      </span>
                    </div>
                    <div className="flex flex-col ml-auto">
                      <span className="text-[10px] text-emerald-500 uppercase font-bold tracking-wider text-right">Provvigione</span>
                      <span className="text-lg font-black text-emerald-600">
                        {formatCurrency(ordine.totale_provvigione)}
                      </span>
                    </div>
                  </div>

                  {/* Riga 3: Date */}
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Ordine</span>
                      <p className="font-medium text-slate-700">{formatDate(ordine.data_ordine)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Ritiro</span>
                      <p className="font-medium text-slate-700">{formatDate(ordine.data_ritiro)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Pagamento</span>
                      <p className="font-medium text-slate-700">{formatDate(ordine.data_incasso_mulino)}</p>
                    </div>
                  </div>
                </div>

                {/* Dettaglio righe mobile */}
                {ordine.righe.length > 0 && ordiniEspansi.includes(ordine.id) && (
                  <div className="bg-slate-50 border-t border-slate-100 p-3 space-y-2">
                    {ordine.righe.map((riga) => (
                      <div key={riga.id} className="bg-white rounded-lg p-2 text-sm border border-slate-200">
                        <div className="flex justify-between font-medium">
                          <span>{riga.prodotto_nome}</span>
                          <span className="text-emerald-600">{formatCurrency(riga.provvigione_calcolata)}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {parseFloat(riga.quintali).toFixed(1)}q · €{parseFloat(riga.prezzo_totale).toFixed(2)} · {formatProvvigione(riga)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

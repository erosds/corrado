import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Package, ChevronRight, Calendar, CheckCircle,
  Clock, Trash2, Search as ViewIcon, ChevronUp, ChevronDown, Filter, X, Factory
} from 'lucide-react';
import { ordiniApi, trasportatoriApi } from '@/lib/api';
import DateHeader from '@/components/DateHeader';

export default function Ordini() {
  const navigate = useNavigate();
  const [ordini, setOrdini] = useState([]);
  const [trasportatori, setTrasportatori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStato, setFiltroStato] = useState('');
  const [filtroTesto, setFiltroTesto] = useState('');
  const [showFiltri, setShowFiltri] = useState(false);
  const [ordinamento, setOrdinamento] = useState({ campo: 'data_ordine', direzione: 'desc' });
  const [eliminando, setEliminando] = useState(null);
  const [ordiniEspansi, setOrdiniEspansi] = useState([]); // Array invece di singolo valore

  useEffect(() => {
    caricaDati();
  }, [filtroStato]);

  const caricaDati = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroStato) params.stato = filtroStato;

      const [ordiniRes, traspRes] = await Promise.all([
        ordiniApi.lista(params),
        trasportatoriApi.lista()
      ]);
      setOrdini(ordiniRes.data);
      setTrasportatori(traspRes.data);
    } catch (error) {
      console.error('Errore caricamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleElimina = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) return;

    setEliminando(id);
    try {
      await ordiniApi.elimina(id);
      setOrdini(ordini.filter(o => o.id !== id));
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Impossibile eliminare l\'ordine');
    } finally {
      setEliminando(null);
    }
  };

  const handleDettaglio = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/ordini/${id}`);
  };

  // Toggle espansione: aggiunge/rimuove dall'array (non chiude gli altri)
  const toggleEspansione = (id) => {
    setOrdiniEspansi(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  // Aggiorna data ritiro inline
  const handleDataRitiroChange = async (ordineId, nuovaData, e) => {
    e.stopPropagation();
    try {
      await ordiniApi.aggiorna(ordineId, { data_ritiro: nuovaData || null });
      setOrdini(ordini.map(o =>
        o.id === ordineId ? { ...o, data_ritiro: nuovaData || null } : o
      ));
    } catch (error) {
      console.error('Errore aggiornamento data ritiro:', error);
    }
  };

  // Aggiorna trasportatore inline
  const handleTrasportatoreChange = async (ordineId, trasportatoreId, e) => {
    e.stopPropagation();
    try {
      const id = trasportatoreId ? parseInt(trasportatoreId) : null;
      await ordiniApi.aggiorna(ordineId, { trasportatore_id: id });
      const trasp = trasportatori.find(t => t.id === id);
      setOrdini(ordini.map(o =>
        o.id === ordineId ? { ...o, trasportatore_id: id, trasportatore_nome: trasp?.nome || null } : o
      ));
    } catch (error) {
      console.error('Errore aggiornamento trasportatore:', error);
    }
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value || 0);
  };

  const handleOrdinamento = (campo) => {
    setOrdinamento(prev => ({
      campo,
      direzione: prev.campo === campo && prev.direzione === 'asc' ? 'desc' : 'asc'
    }));
  };

  const IconaOrdinamento = ({ campo }) => {
    if (ordinamento.campo !== campo) return null;
    return ordinamento.direzione === 'asc'
      ? <ChevronUp size={14} className="inline ml-1" />
      : <ChevronDown size={14} className="inline ml-1" />;
  };

  const ordiniFiltrati = ordini
    .filter(o => {
      if (!filtroTesto) return true;
      const testo = filtroTesto.toLowerCase();
      return (
        o.cliente_nome?.toLowerCase().includes(testo) ||
        o.id?.toString().includes(testo)
      );
    })
    .sort((a, b) => {
      const dir = ordinamento.direzione === 'asc' ? 1 : -1;
      const valA = a[ordinamento.campo];
      const valB = b[ordinamento.campo];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string') {
        return valA.localeCompare(valB) * dir;
      }
      return (valA - valB) * dir;
    });

  const ordiniInseriti = ordini.filter(o => o.stato === 'inserito').length;
  const ordiniRitirati = ordini.filter(o => o.stato === 'ritirato').length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <DateHeader />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Ordini</h1>
          <p className="text-slate-500 text-sm mt-1">
            {ordiniInseriti} in attesa · {ordiniRitirati} ritirati
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

      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per cliente o ID..."
            value={filtroTesto}
            onChange={(e) => setFiltroTesto(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          />
          {filtroTesto && (
            <button
              onClick={() => setFiltroTesto('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFiltri(!showFiltri)}
          className={`px-4 py-3 border rounded-xl flex items-center gap-2 transition-colors ${showFiltri ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
        >
          <Filter size={18} />
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setFiltroStato('')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors ${filtroStato === ''
            ? 'bg-slate-900 text-white'
            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
        >
          Tutti ({ordini.length})
        </button>
        <button
          onClick={() => setFiltroStato('inserito')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${filtroStato === 'inserito'
            ? 'bg-amber-500 text-white'
            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
        >
          <Clock size={16} />
          In attesa ({ordiniInseriti})
        </button>
        <button
          onClick={() => setFiltroStato('ritirato')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${filtroStato === 'ritirato'
            ? 'bg-emerald-500 text-white'
            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
        >
          <CheckCircle size={16} />
          Ritirati ({ordiniRitirati})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : ordiniFiltrati.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500">Nessun ordine trovato</p>
          <Link
            to="/ordini/nuovo"
            className="mt-4 inline-flex items-center gap-2 text-slate-900 underline"
          >
            <Plus size={16} />
            Crea il primo ordine
          </Link>
        </div>
      ) : (
        <>
          {/* Vista Desktop - Tabella */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th
                      className="text-left px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleOrdinamento('id')}
                    >
                      ID <IconaOrdinamento campo="id" />
                    </th>
                    <th
                      className="text-left px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleOrdinamento('cliente_nome')}
                    >
                      Cliente <IconaOrdinamento campo="cliente_nome" />
                    </th>
                    <th
                      className="text-left px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleOrdinamento('data_ordine')}
                    >
                      Data Ordine <IconaOrdinamento campo="data_ordine" />
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">
                      Tipo
                    </th>
                    <th
                      className="text-right px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleOrdinamento('totale_quintali')}
                    >
                      Quintali <IconaOrdinamento campo="totale_quintali" />
                    </th>
                    <th
                      className="text-right px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleOrdinamento('totale_importo')}
                    >
                      Importo <IconaOrdinamento campo="totale_importo" />
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">
                      Stato
                    </th>
                    <th
                      className="text-left px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleOrdinamento('data_ritiro')}
                    >
                      Data Ritiro <IconaOrdinamento campo="data_ritiro" />
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">
                      Trasportatore
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordiniFiltrati.map((ordine) => (
                    <React.Fragment key={ordine.id}>
                      <tr
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${ordiniEspansi.includes(ordine.id) ? 'bg-slate-50' : ''}`}
                        onClick={() => toggleEspansione(ordine.id)}
                      >
                        <td className="px-4 py-3 text-sm font-medium">#{ordine.id}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{ordine.cliente_nome}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(ordine.data_ordine)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${ordine.tipo_ordine === 'pedane'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                            }`}>
                            {ordine.tipo_ordine}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {parseFloat(ordine.totale_quintali || 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {formatCurrency(ordine.totale_importo)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${ordine.stato === 'ritirato'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                            }`}>
                            {ordine.stato === 'ritirato' ? '✓ Ritirato' : 'In attesa'}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="date"
                            value={ordine.data_ritiro || ''}
                            onChange={(e) => handleDataRitiroChange(ordine.id, e.target.value, e)}
                            className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white w-36"
                          />
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={ordine.trasportatore_id || ''}
                            onChange={(e) => handleTrasportatoreChange(ordine.id, e.target.value, e)}
                            className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white w-32"
                          >
                            <option value="">-</option>
                            {trasportatori.map(t => (
                              <option key={t.id} value={t.id}>{t.nome}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => handleDettaglio(ordine.id, e)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Vedi Dettaglio"
                            >
                              <ViewIcon size={18} />
                            </button>
                            <button
                              onClick={(e) => handleElimina(ordine.id, e)}
                              disabled={eliminando === ordine.id}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Elimina"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {ordiniEspansi.includes(ordine.id) && ordine.righe && ordine.righe.length > 0 && (
                        <tr className="bg-slate-50">
                          <td colSpan={10} className="px-4 py-3">
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                              <table className="w-full">
                                <thead className="bg-slate-100">
                                  <tr>
                                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">
                                      Quintali
                                    </th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">
                                      Prodotto
                                    </th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">
                                      Tipologia
                                    </th>
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">
                                      Mulino
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {ordine.righe.map((riga) => (
                                    <tr key={riga.id} className="text-sm">
                                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                                        {parseFloat(riga.quintali || 0).toFixed(1)}
                                      </td>
                                      <td className="px-4 py-2.5 font-medium text-slate-900">
                                        {riga.prodotto_nome || '-'}
                                      </td>
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
                                      <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <Factory size={14} className="text-slate-400" />
                                          <span className="text-slate-700">{riga.mulino_nome || '-'}</span>
                                        </div>
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

          {/* Vista Mobile - Card */}
          <div className="md:hidden space-y-3">
            {ordiniFiltrati.map((ordine) => (
              <div key={ordine.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div
                  onClick={() => toggleEspansione(ordine.id)}
                  className="block p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 truncate">
                          {ordine.cliente_nome}
                        </h3>
                        <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-bold rounded-full ${ordine.stato === 'ritirato'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                          }`}>
                          {ordine.stato === 'ritirato' ? '✓' : '○'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        Ordine #{ordine.id} · {formatDate(ordine.data_ordine)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={(e) => handleDettaglio(ordine.id, e)}
                        className="p-2 bg-slate-100 rounded-lg text-slate-600"
                      >
                        <ViewIcon size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${ordine.tipo_ordine === 'pedane'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                      }`}>
                      {ordine.tipo_ordine}
                    </span>
                    <span className="font-medium">
                      {parseFloat(ordine.totale_quintali || 0).toFixed(1)} q
                    </span>
                    <span className="text-slate-500">
                      {formatCurrency(ordine.totale_importo)}
                    </span>
                  </div>

                  {/* Campi editabili mobile */}
                  <div className="flex gap-3 mt-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">Ritiro</label>
                      <input
                        type="date"
                        value={ordine.data_ritiro || ''}
                        onChange={(e) => handleDataRitiroChange(ordine.id, e.target.value, e)}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">Trasportatore</label>
                      <select
                        value={ordine.trasportatore_id || ''}
                        onChange={(e) => handleTrasportatoreChange(ordine.id, e.target.value, e)}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
                      >
                        <option value="">-</option>
                        {trasportatori.map(t => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {ordine.righe && ordine.righe.length > 0 && ordiniEspansi.includes(ordine.id) && (
                  <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-2">
                    {ordine.righe.map((riga) => (
                      <div key={riga.id} className="bg-white rounded-xl p-3 border border-slate-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{riga.prodotto_nome}</p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                              {riga.prodotto_tipologia && (
                                <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${riga.prodotto_tipologia === '00'
                                  ? 'bg-amber-100 text-amber-700'
                                  : riga.prodotto_tipologia === '0'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-slate-100 text-slate-600'
                                  }`}>
                                  {riga.prodotto_tipologia}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Factory size={12} />
                                {riga.mulino_nome}
                              </span>
                            </div>
                          </div>
                          <span className="font-bold text-slate-900">
                            {parseFloat(riga.quintali || 0).toFixed(1)}
                          </span>
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
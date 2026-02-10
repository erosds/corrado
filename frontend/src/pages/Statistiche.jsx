import { useState, useEffect } from 'react';
import { 
  BarChart3, Calendar, Factory, TrendingUp, 
  ChevronDown, Euro, Package, Users
} from 'lucide-react';
import { statisticheApi, muliniApi } from '@/lib/api';

export default function Statistiche() {
  const [tab, setTab] = useState('provvigioni'); // 'provvigioni' | 'clienti' | 'prodotti'
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [trimestre, setTrimestre] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [datiProvvigioni, setDatiProvvigioni] = useState(null);
  const [datiClienti, setDatiClienti] = useState([]);
  const [datiProdotti, setDatiProdotti] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mulinoDettaglio, setMulinoDettaglio] = useState(null);
  const [dettaglioProvvigioni, setDettaglioProvvigioni] = useState([]);

  useEffect(() => {
    if (tab === 'provvigioni') {
      caricaProvvigioni();
    } else if (tab === 'clienti') {
      caricaVendutoClienti();
    } else if (tab === 'prodotti') {
      caricaVendutoProdotti();
    }
  }, [tab, anno, trimestre]);

  const caricaProvvigioni = async () => {
    try {
      setLoading(true);
      const { data } = await statisticheApi.provvigioniTrimestre(anno, trimestre);
      setDatiProvvigioni(data);
    } catch (error) {
      console.error('Errore caricamento provvigioni:', error);
    } finally {
      setLoading(false);
    }
  };

  const caricaVendutoClienti = async () => {
    try {
      setLoading(true);
      const { data } = await statisticheApi.vendutoPerCliente({ limit: 20 });
      setDatiClienti(data);
    } catch (error) {
      console.error('Errore caricamento clienti:', error);
    } finally {
      setLoading(false);
    }
  };

  const caricaVendutoProdotti = async () => {
    try {
      setLoading(true);
      const { data } = await statisticheApi.vendutoPerProdotto({ limit: 20 });
      setDatiProdotti(data);
    } catch (error) {
      console.error('Errore caricamento prodotti:', error);
    } finally {
      setLoading(false);
    }
  };

  const caricaDettaglioMulino = async (mulino) => {
    try {
      setMulinoDettaglio(mulino);
      const { data } = await statisticheApi.provvigioniDettaglioMulino(
        mulino.mulino_id, 
        anno, 
        trimestre
      );
      setDettaglioProvvigioni(data);
    } catch (error) {
      console.error('Errore caricamento dettaglio:', error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
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

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Statistiche</h1>
        <p className="text-slate-500 text-sm mt-1">
          Report e analisi vendite
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setTab('provvigioni')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
            tab === 'provvigioni'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Euro size={16} />
          Provvigioni
        </button>
        <button
          onClick={() => setTab('clienti')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
            tab === 'clienti'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users size={16} />
          Per Cliente
        </button>
        <button
          onClick={() => setTab('prodotti')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
            tab === 'prodotti'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Package size={16} />
          Per Prodotto
        </button>
      </div>

      {/* Tab Provvigioni */}
      {tab === 'provvigioni' && (
        <>
          {/* Selettori Periodo */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Anno</label>
              <select
                value={anno}
                onChange={(e) => setAnno(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {anni.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Trimestre</label>
              <select
                value={trimestre}
                onChange={(e) => setTrimestre(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {trimestri.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="h-32 bg-slate-100 rounded-2xl animate-pulse"></div>
              <div className="h-48 bg-slate-100 rounded-2xl animate-pulse"></div>
            </div>
          ) : datiProvvigioni ? (
            <>
              {/* Card Riepilogo */}
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-3xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4 text-emerald-200">
                  <Calendar size={16} />
                  <span className="text-sm font-medium">
                    {trimestri.find(t => t.value === trimestre)?.label} {anno}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-emerald-200 text-xs uppercase tracking-wider">Provvigioni</p>
                    <p className="text-2xl md:text-3xl font-black">
                      {formatCurrency(datiProvvigioni.totale_provvigioni)}
                    </p>
                  </div>
                  <div>
                    <p className="text-emerald-200 text-xs uppercase tracking-wider">Incassato</p>
                    <p className="text-xl md:text-2xl font-bold">
                      {formatCurrency(datiProvvigioni.totale_incassato)}
                    </p>
                  </div>
                  <div>
                    <p className="text-emerald-200 text-xs uppercase tracking-wider">Quintali</p>
                    <p className="text-xl md:text-2xl font-bold">
                      {parseFloat(datiProvvigioni.totale_quintali).toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista per Mulino */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold">Dettaglio per Mulino</h3>
                </div>

                {datiProvvigioni.provvigioni_per_mulino.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <BarChart3 size={32} className="mx-auto mb-2" />
                    <p>Nessun dato per questo periodo</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {datiProvvigioni.provvigioni_per_mulino.map((mulino) => (
                      <div key={mulino.mulino_id}>
                        <button
                          onClick={() => caricaDettaglioMulino(mulino)}
                          className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-orange-100 rounded-xl">
                                <Factory size={18} className="text-orange-600" />
                              </div>
                              <div>
                                <p className="font-bold">{mulino.mulino_nome}</p>
                                <p className="text-sm text-slate-500">
                                  {mulino.num_ordini} ordini · {parseFloat(mulino.totale_quintali).toFixed(0)} q
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-emerald-600">
                                {formatCurrency(mulino.totale_provvigione)}
                              </p>
                              <p className="text-xs text-slate-500">
                                su {formatCurrency(mulino.totale_incassato)}
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Dettaglio espanso */}
                        {mulinoDettaglio?.mulino_id === mulino.mulino_id && (
                          <div className="bg-slate-50 px-4 pb-4">
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-100">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium">Cliente</th>
                                    <th className="px-3 py-2 text-left font-medium">Prodotto</th>
                                    <th className="px-3 py-2 text-right font-medium">Q.li</th>
                                    <th className="px-3 py-2 text-right font-medium">Provv.</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {dettaglioProvvigioni.map((d, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                      <td className="px-3 py-2">{d.cliente_nome}</td>
                                      <td className="px-3 py-2">{d.prodotto_nome}</td>
                                      <td className="px-3 py-2 text-right">
                                        {parseFloat(d.quintali).toFixed(1)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-medium text-emerald-600">
                                        {formatCurrency(d.provvigione_calcolata)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </>
      )}

      {/* Tab Clienti */}
      {tab === 'clienti' && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold">Top Clienti per Fatturato</h3>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Caricamento...</div>
          ) : datiClienti.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Users size={32} className="mx-auto mb-2" />
              <p>Nessun dato disponibile</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {datiClienti.map((cliente, idx) => (
                <div key={cliente.cliente_id} className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{cliente.cliente_nome}</p>
                    <p className="text-sm text-slate-500">
                      {cliente.num_ordini} ordini · {parseFloat(cliente.totale_quintali).toFixed(0)} q
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(cliente.totale_importo)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Prodotti */}
      {tab === 'prodotti' && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold">Top Prodotti per Volume</h3>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Caricamento...</div>
          ) : datiProdotti.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Package size={32} className="mx-auto mb-2" />
              <p>Nessun dato disponibile</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {datiProdotti.map((prodotto, idx) => (
                <div key={prodotto.prodotto_id} className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{prodotto.prodotto_nome}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Factory size={12} />
                      {prodotto.mulino_nome} · {prodotto.num_ordini} ordini
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{parseFloat(prodotto.totale_quintali).toFixed(0)} q</p>
                    <p className="text-xs text-slate-500">{formatCurrency(prodotto.totale_importo)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
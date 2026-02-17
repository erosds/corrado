import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, Trash2, CheckCircle,
  Calendar, Factory, Package, User, Truck, Mail, X, Send
} from 'lucide-react';
import { ordiniApi } from '@/lib/api';

export default function OrdineDettaglio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ordine, setOrdine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMailDialog, setShowMailDialog] = useState(false);
  const [mailData, setMailData] = useState({});
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    caricaOrdine();
  }, [id]);

  // Calcola lo stato automaticamente dalla data di ritiro
  const calcolaStato = (dataRitiro) => {
    if (!dataRitiro) return 'inserito';
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const ritiro = new Date(dataRitiro);
    ritiro.setHours(0, 0, 0, 0);
    return ritiro <= oggi ? 'ritirato' : 'inserito';
  };

  const caricaOrdine = async () => {
    try {
      setLoading(true);
      const { data } = await ordiniApi.dettaglio(id);
      setOrdine(data);
    } catch (error) {
      console.error('Errore caricamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) return;

    try {
      await ordiniApi.elimina(id);
      navigate('/ordini');
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Impossibile eliminare l\'ordine');
    }
  };

  const openMailDialog = () => {
    // Raggruppa righe per mulino
    const gruppi = {};
    for (const riga of ordine.righe) {
      const mid = riga.mulino_id;
      if (!gruppi[mid]) {
        gruppi[mid] = {
          mulino_id: mid,
          mulino_nome: riga.mulino_nome,
          mulino_email: riga.mulino_email || '',
          righe: []
        };
      }
      gruppi[mid].righe.push(riga);
    }

    // Pre-compila subject e body per ogni mulino
    const initial = {};
    for (const [mid, gruppo] of Object.entries(gruppi)) {
      const righeText = gruppo.righe.map(r => {
        const tipologia = r.prodotto_tipologia ? ` (${r.prodotto_tipologia})` : '';
        const pedane = r.pedane ? `, ${parseFloat(r.pedane)} ped` : '';
        return `- ${r.prodotto_nome}${tipologia} — ${parseFloat(r.quintali)} q${pedane} — €${parseFloat(r.prezzo_quintale)}/q`;
      }).join('\n');

      const totQ = gruppo.righe.reduce((s, r) => s + parseFloat(r.quintali || 0), 0);

      const body = `Buongiorno,

vi inviamo il seguente ordine:

Cliente: ${ordine.cliente_nome}
Indirizzo consegna: ${ordine.cliente_indirizzo || '-'}
Data ordine: ${formatDate(ordine.data_ordine)}
Data ritiro: ${ordine.data_ritiro ? formatDate(ordine.data_ritiro) : 'Da definire'}

Prodotti:
${righeText}

Totale: ${totQ.toFixed(1)} q

Cordiali saluti`;

      initial[mid] = {
        ...gruppo,
        subject: `Ordine #${ordine.id} - ${ordine.cliente_nome}`,
        body
      };
    }

    setMailData(initial);
    setShowMailDialog(true);
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      const emails = Object.values(mailData).map(g => ({
        mulino_id: g.mulino_id,
        to: g.mulino_email,
        subject: g.subject,
        body: g.body
      }));
      await ordiniApi.inviaEmail(id, { emails });
      setShowMailDialog(false);
      await caricaOrdine();
    } catch (error) {
      console.error('Errore invio email:', error);
      alert('Errore durante l\'invio delle email: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSendingEmail(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const calcolaTotali = () => {
    if (!ordine?.righe) return { quintali: 0, importo: 0 };
    const quintali = ordine.righe.reduce((sum, r) => sum + parseFloat(r.quintali || 0), 0);
    const importo = ordine.righe.reduce((sum, r) => sum + parseFloat(r.prezzo_totale || 0), 0);
    return { quintali, importo };
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-32 bg-slate-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!ordine) {
    return (
      <div className="p-4 md:p-8 text-center">
        <p className="text-slate-500">Ordine non trovato</p>
        <Link to="/ordini" className="text-slate-900 underline mt-2 inline-block">
          Torna alla lista
        </Link>
      </div>
    );
  }

  const { quintali, importo } = calcolaTotali();

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            to="/ordini"
            className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={16} />
            Ordini
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Ordine #{ordine.id}
            </h1>
            <span className={`px-3 py-1 text-sm font-bold rounded-full ${calcolaStato(ordine.data_ritiro) === 'ritirato'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
              }`}>
              {calcolaStato(ordine.data_ritiro) === 'ritirato' ? 'Ritirato' : 'In attesa'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/ordini/${ordine.id}/modifica`}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
            title="Modifica ordine"
          >
            <Edit size={18} />
          </Link>
          <button
            onClick={handleDelete}
            className="p-2.5 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
            title="Elimina ordine"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Card Riepilogo */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <Link
              to={`/clienti/${ordine.cliente_id}`}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <User size={16} />
              <span className="text-lg font-bold">{ordine.cliente_nome}</span>
            </Link>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${ordine.tipo_ordine === 'pedane'
              ? 'bg-blue-500/20 text-blue-300'
              : 'bg-purple-500/20 text-purple-300'
            }`}>
            {ordine.tipo_ordine}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-slate-400 text-sm">Totale Quintali</p>
            <p className="text-3xl font-black">{quintali.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Totale Importo</p>
            <p className="text-3xl font-black">€{importo.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Date */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">
          Date
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              <Calendar size={16} />
              Data ordine
            </span>
            <span className="font-medium">{formatDate(ordine.data_ordine)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              <Truck size={16} />
              Data ritiro
            </span>
            <span className="font-medium">{formatDate(ordine.data_ritiro)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              <CheckCircle size={16} />
              Data incasso mulino
            </span>
            <span className="font-medium">{formatDate(ordine.data_incasso_mulino)}</span>
          </div>
        </div>
      </div>

      {/* Trasportatore */}
      {ordine.trasportatore_nome && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">
            Trasportatore
          </h3>
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-slate-500" />
            <span className="font-medium">{ordine.trasportatore_nome}</span>
          </div>
        </div>
      )}

      {/* Righe Ordine */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold">Prodotti ({ordine.righe?.length || 0})</h3>
        </div>

        {ordine.righe && ordine.righe.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {ordine.righe.map((riga, idx) => (
              <div key={idx} className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold">{riga.prodotto_nome}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Factory size={14} />
                      {riga.mulino_nome}
                    </p>
                  </div>
                  <p className="font-bold text-lg">€{parseFloat(riga.prezzo_totale).toFixed(2)}</p>
                </div>

                <div className="flex gap-4 text-sm text-slate-600">
                  {riga.pedane && (
                    <span>{parseFloat(riga.pedane)} pedane</span>
                  )}
                  <span>{parseFloat(riga.quintali).toFixed(2)} q</span>
                  <span>@ €{parseFloat(riga.prezzo_quintale).toFixed(2)}/q</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400">
            <Package size={32} className="mx-auto mb-2" />
            <p>Nessun prodotto</p>
          </div>
        )}
      </div>

      {/* Note */}
      {ordine.note && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">
            Note
          </h3>
          <p className="text-slate-700 whitespace-pre-wrap">{ordine.note}</p>
        </div>
      )}

      {/* Sezione Mail */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">
          Email Mulino
        </h3>
        {ordine.email_inviata_il ? (
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle size={18} />
            <span className="font-medium">Inviata il {formatDate(ordine.email_inviata_il)}</span>
          </div>
        ) : (
          <button
            onClick={openMailDialog}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            <Mail size={18} />
            Invia Mail al Mulino
          </button>
        )}
      </div>

      {/* Mail Dialog */}
      {showMailDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold">Invia Ordine ai Mulini</h2>
              <button onClick={() => setShowMailDialog(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {Object.values(mailData).map((gruppo) => (
                <div key={gruppo.mulino_id} className="border border-slate-200 rounded-xl p-4">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <Factory size={16} className="text-slate-500" />
                    {gruppo.mulino_nome}
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Da</label>
                      <input
                        type="text"
                        value={ordine.mail_from || ''}
                        readOnly
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">A</label>
                      <input
                        type="text"
                        value={gruppo.mulino_email || 'Email non configurata'}
                        readOnly
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Oggetto</label>
                      <input
                        type="text"
                        value={gruppo.subject}
                        onChange={(e) => setMailData(prev => ({
                          ...prev,
                          [gruppo.mulino_id]: { ...prev[gruppo.mulino_id], subject: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Corpo</label>
                      <textarea
                        value={gruppo.body}
                        onChange={(e) => setMailData(prev => ({
                          ...prev,
                          [gruppo.mulino_id]: { ...prev[gruppo.mulino_id], body: e.target.value }
                        }))}
                        rows={12}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono resize-y"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowMailDialog(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Annulla
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Send size={16} />
                {sendingEmail ? 'Invio in corso...' : 'Invia'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
/**
 * CaricoCard - Card per visualizzare un carico in composizione
 * 
 * Mostra:
 * - Barra di riempimento (verde >280, giallo 200-280, rosso <200)
 * - Lista ordini inclusi
 * - Azioni (conferma spedizione, aggiungi ordini)
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Truck, Package, Plus, Check, AlertTriangle, 
  ChevronDown, ChevronUp, X, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Costanti
const OBIETTIVO = 300;
const SOGLIA_MINIMA = 280;
const SOGLIA_MASSIMA = 320;

export default function CaricoCard({ 
  carico, 
  ordini = [], 
  tipo = 'esistente', // 'esistente' | 'suggerimento' | 'nuovo'
  onAggiungiOrdine,
  onRimuoviOrdine,
  onConferma,
  onCrea,
  expanded: externalExpanded,
  className = ''
}) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const toggleExpanded = () => setInternalExpanded(prev => !prev);

  // Calcoli
  const totaleQuintali = ordini.reduce((sum, o) => sum + parseFloat(o.totale_quintali || 0), 0);
  const percentuale = Math.min(100, (totaleQuintali / OBIETTIVO) * 100);
  const quintaliMancanti = Math.max(0, OBIETTIVO - totaleQuintali);
  const isCompleto = totaleQuintali >= SOGLIA_MINIMA;
  const isEccesso = totaleQuintali > SOGLIA_MASSIMA;

  // Colori basati sul riempimento
  const getBarColor = () => {
    if (isEccesso) return 'bg-red-500';
    if (isCompleto) return 'bg-emerald-500';
    if (percentuale >= 66) return 'bg-amber-500';
    if (percentuale >= 33) return 'bg-orange-400';
    return 'bg-slate-300';
  };

  const getCardStyle = () => {
    if (tipo === 'suggerimento') {
      return 'border-2 border-dashed border-blue-300 bg-blue-50/50';
    }
    if (isCompleto) {
      return 'border-2 border-emerald-200 bg-emerald-50/30';
    }
    return 'border border-slate-200 bg-white';
  };

  // Data più urgente tra gli ordini
  const dataPiuUrgente = ordini.reduce((min, o) => {
    const dataRitiro = o.data_ritiro ? new Date(o.data_ritiro) : null;
    if (!dataRitiro) return min;
    if (!min) return dataRitiro;
    return dataRitiro < min ? dataRitiro : min;
  }, null);

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short'
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`rounded-2xl p-4 transition-all ${getCardStyle()} ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {tipo === 'suggerimento' ? (
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Package size={16} className="text-blue-600" />
            </div>
          ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isCompleto ? 'bg-emerald-100' : 'bg-amber-100'
            }`}>
              <Truck size={16} className={isCompleto ? 'text-emerald-600' : 'text-amber-600'} />
            </div>
          )}
          
          <div>
            <div className="flex items-center gap-2">
              {tipo === 'suggerimento' ? (
                <span className="font-semibold text-blue-700">Combinazione suggerita</span>
              ) : tipo === 'nuovo' ? (
                <span className="font-semibold text-slate-700">Nuovo carico</span>
              ) : (
                <span className="font-semibold text-slate-700">
                  Carico #{carico?.id}
                </span>
              )}
              
              {isCompleto && tipo !== 'suggerimento' && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700">
                  Pronto
                </span>
              )}
              
              {isEccesso && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                  <AlertTriangle size={10} />
                  Eccesso
                </span>
              )}
            </div>
            
            {dataPiuUrgente && (
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <Calendar size={10} />
                Ritiro entro {formatDate(dataPiuUrgente)}
              </div>
            )}
          </div>
        </div>

        {/* Badge tipo ordine */}
        {(carico?.tipo_carico || ordini[0]?.tipo_ordine) && (
          <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
            (carico?.tipo_carico || ordini[0]?.tipo_ordine) === 'pedane'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {carico?.tipo_carico || ordini[0]?.tipo_ordine}
          </span>
        )}
      </div>

      {/* Barra progresso */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black ${isEccesso ? 'text-red-600' : ''}`}>
              {totaleQuintali.toFixed(0)}
            </span>
            <span className="text-slate-400 text-sm">/ {OBIETTIVO} q.li</span>
          </div>
          
          {!isCompleto && (
            <span className="text-xs text-slate-500">
              Mancano <strong>{quintaliMancanti.toFixed(0)}</strong> q.li
            </span>
          )}
        </div>
        
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, percentuale)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`h-full rounded-full ${getBarColor()}`}
          />
        </div>
      </div>

      {/* Lista ordini (collassabile) */}
      <div>
        <button
          onClick={toggleExpanded}
          className="w-full flex items-center justify-between py-2 text-sm text-slate-600 hover:text-slate-800"
        >
          <span>{ordini.length} ordini inclusi</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {ordini.map((ordine) => (
                  <div 
                    key={ordine.id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-700 truncate">
                        {ordine.cliente_nome}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{parseFloat(ordine.totale_quintali).toFixed(0)} q.li</span>
                        {ordine.data_ritiro && (
                          <>
                            <span>•</span>
                            <span>{formatDate(ordine.data_ritiro)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {onRimuoviOrdine && tipo !== 'suggerimento' && (
                      <button
                        onClick={() => onRimuoviOrdine(ordine.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Azioni */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
        {tipo === 'suggerimento' ? (
          <button
            onClick={onCrea}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Crea questo carico
          </button>
        ) : (
          <>
            {onAggiungiOrdine && (
              <button
                onClick={onAggiungiOrdine}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
              >
                <Plus size={16} />
                Aggiungi
              </button>
            )}
            
            {isCompleto && onConferma && (
              <button
                onClick={onConferma}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <Check size={16} />
                Conferma
              </button>
            )}
            
            {!isCompleto && !onAggiungiOrdine && (
              <Link
                to={`/carichi/${carico?.id}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
              >
                Dettagli
              </Link>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
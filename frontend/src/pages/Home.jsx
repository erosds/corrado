import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, ShoppingCart, Factory, Truck, Receipt, 
  Package, ArrowUpRight, Plus, Calculator
} from 'lucide-react';
import { motion } from 'framer-motion';
import { carichiApi } from '@/lib/api';

export default function Home() {
  const [carichiAperti, setCarichiAperti] = useState([]);

  useEffect(() => {
    caricaCarichiAperti();
  }, []);

  const caricaCarichiAperti = async () => {
    try {
      const { data } = await carichiApi.aperti();
      setCarichiAperti(data);
    } catch (error) {
      console.error('Errore caricamento carichi:', error);
    }
  };

  // Formatta la data corrente
  const oggi = new Date();
  const opzioniData = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  };
  const dataFormattata = oggi.toLocaleDateString('it-IT', opzioniData);
  // Prima lettera maiuscola
  const dataCapitalizzata = dataFormattata.charAt(0).toUpperCase() + dataFormattata.slice(1);

  // Menu items - tutte le sezioni come riquadri uniformi
  const menuItems = [
    { 
      to: '/ordini', 
      icon: ShoppingCart, 
      title: 'Ordini', 
      desc: 'Gestisci ordini clienti',
      color: 'bg-blue-50 text-blue-600'
    },
    { 
      to: '/ordini/nuovo', 
      icon: Plus, 
      title: 'Nuovo Ordine', 
      desc: 'Crea un nuovo ordine',
      color: 'bg-emerald-50 text-emerald-600'
    },
    { 
      to: '/clienti', 
      icon: Users, 
      title: 'Clienti', 
      desc: 'Anagrafica e prezzi',
      color: 'bg-violet-50 text-violet-600'
    },
    { 
      to: '/mulini', 
      icon: Factory, 
      title: 'Mulini', 
      desc: 'Fornitori e prodotti',
      color: 'bg-amber-50 text-amber-600'
    },
    { 
      to: '/carichi', 
      icon: Truck, 
      title: 'Carichi', 
      desc: 'Carichi completi',
      color: 'bg-rose-50 text-rose-600'
    },
    { 
      to: '/trasportatori', 
      icon: Truck, 
      title: 'Trasportatori', 
      desc: 'Gestione trasportatori',
      color: 'bg-cyan-50 text-cyan-600'
    },
    { 
      to: '/pagamenti', 
      icon: Receipt, 
      title: 'Pagamenti', 
      desc: 'Report e analisi',
      color: 'bg-indigo-50 text-indigo-600'
    },
    { 
      to: '/pagamenti?tab=provvigioni', 
      icon: Calculator, 
      title: 'Provvigioni', 
      desc: 'Calcolo provvigioni',
      color: 'bg-teal-50 text-teal-600'
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Data corrente */}
      <div className="mb-2 text-sm text-slate-500">
        {dataCapitalizzata}
      </div>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Home
        </h1>
      </div>

      {/* Alert Carichi Aperti */}
      {carichiAperti.length > 0 && (
        <Link
          to="/carichi"
          className="block mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-amber-800">
                {carichiAperti.length} caric{carichiAperti.length === 1 ? 'o' : 'i'} apert{carichiAperti.length === 1 ? 'o' : 'i'}
              </p>
              <p className="text-sm text-amber-700">
                {carichiAperti.reduce((sum, c) => sum + parseFloat(c.totale_quintali || 0), 0).toFixed(0)} quintali caricati
              </p>
            </div>
            <ArrowUpRight size={20} className="text-amber-600" />
          </div>
        </Link>
      )}

      {/* Menu Grid - 4 colonne desktop, 2 mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {menuItems.map((item, i) => (
          <motion.div
            key={item.to + item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={item.to}
              className="block bg-white rounded-2xl p-4 md:p-5 border border-slate-100 hover:border-slate-300 hover:shadow-lg transition-all group h-full"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 md:p-3 rounded-xl ${item.color} group-hover:scale-110 transition-transform`}>
                  <item.icon size={20} strokeWidth={1.5} />
                </div>
                <ArrowUpRight 
                  size={16} 
                  className="text-slate-300 group-hover:text-slate-500 transition-colors" 
                />
              </div>
              <h2 className="text-base md:text-lg font-bold mb-0.5">{item.title}</h2>
              <p className="text-slate-500 text-xs md:text-sm">{item.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-slate-100 text-center">
      </footer>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ShoppingCart, Factory, BarChart3, Truck, Package, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { carichiApi } from '@/lib/api';

const menuItems = [
  { 
    to: '/clienti',
    title: 'Clienti', 
    desc: 'Anagrafica e prezzi', 
    icon: Users, 
    color: 'bg-blue-50 text-blue-600',
  },
  { 
    to: '/ordini',
    title: 'Ordini', 
    desc: 'Inserimento e storico', 
    icon: ShoppingCart, 
    color: 'bg-emerald-50 text-emerald-600',
  },
  { 
    to: '/mulini',
    title: 'Mulini', 
    desc: 'Fornitori e prodotti', 
    icon: Factory, 
    color: 'bg-orange-50 text-orange-600',
  },
  { 
    to: '/statistiche',
    title: 'Statistiche', 
    desc: 'Provvigioni e report', 
    icon: BarChart3, 
    color: 'bg-purple-50 text-purple-600',
  },
];

export default function Home() {
  const [carichiAperti, setCarichiAperti] = useState([]);
  const [loadingCarichi, setLoadingCarichi] = useState(true);

  useEffect(() => {
    caricaCarichiAperti();
  }, []);

  const caricaCarichiAperti = async () => {
    try {
      const { data } = await carichiApi.aperti();
      setCarichiAperti(data);
    } catch (error) {
      console.error('Errore caricamento carichi:', error);
    } finally {
      setLoadingCarichi(false);
    }
  };

  const oggi = new Date();
  const opzioniData = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const dataFormattata = oggi.toLocaleDateString('it-IT', opzioniData);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <p className="text-slate-400 text-sm font-medium capitalize">{dataFormattata}</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-1">
          Buongiorno 👋
        </h1>
      </header>

      {/* Carichi Aperti Alert */}
      {!loadingCarichi && carichiAperti.length > 0 && (
        <Link 
          to="/carichi"
          className="block mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-200 rounded-xl">
              <Truck size={20} className="text-amber-700" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-900">
                {carichiAperti.length} carich{carichiAperti.length === 1 ? 'o' : 'i'} apert{carichiAperti.length === 1 ? 'o' : 'i'}
              </p>
              <p className="text-sm text-amber-700">
                {carichiAperti.reduce((sum, c) => sum + parseFloat(c.totale_quintali || 0), 0).toFixed(0)} quintali caricati
              </p>
            </div>
            <ArrowUpRight size={20} className="text-amber-600" />
          </div>
        </Link>
      )}

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {menuItems.map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link
              to={item.to}
              className="block bg-white rounded-2xl p-5 border border-slate-100 hover:border-slate-300 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${item.color} group-hover:scale-110 transition-transform`}>
                  <item.icon size={24} strokeWidth={1.5} />
                </div>
                <ArrowUpRight 
                  size={20} 
                  className="text-slate-300 group-hover:text-slate-500 transition-colors" 
                />
              </div>
              <h2 className="text-xl font-bold mb-1">{item.title}</h2>
              <p className="text-slate-500 text-sm">{item.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">
          Azioni Rapide
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/ordini/nuovo"
            className="flex items-center gap-3 p-4 bg-slate-900 text-white rounded-xl hover:bg-black transition-colors"
          >
            <Package size={20} />
            <span className="font-medium">Nuovo Ordine</span>
          </Link>
          <Link
            to="/carichi"
            className="flex items-center gap-3 p-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <Truck size={20} />
            <span className="font-medium">Carichi</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400">
          Gestionale Farina v1.0 · Corrado Irlando
        </p>
      </footer>
    </div>
  );
}
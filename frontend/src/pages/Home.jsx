import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, ShoppingCart, Factory, Truck, Receipt,
  Package, ArrowUpRight, Plus, Calculator, Search, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { carichiApi, clientiApi } from '@/lib/api';
import DateHeader from '@/components/DateHeader';


export default function Home() {
  const navigate = useNavigate();
  const [carichiAperti, setCarichiAperti] = useState([]);
  const [clientiTutti, setClientiTutti] = useState([]);
  const [cercaCliente, setCercaCliente] = useState('');
  const [showClientiDropdown, setShowClientiDropdown] = useState(false);
  const cercaRef = useRef(null);

  useEffect(() => {
    caricaCarichiAperti();
    caricaClienti();
  }, []);

  const caricaCarichiAperti = async () => {
    try {
      const { data } = await carichiApi.aperti();
      setCarichiAperti(data);
    } catch (error) {
      console.error('Errore caricamento carichi:', error);
    }
  };

  const caricaClienti = async () => {
    try {
      const { data } = await clientiApi.lista();
      setClientiTutti(data);
    } catch (error) {
      console.error('Errore caricamento clienti:', error);
    }
  };

  const clientiFiltrati = cercaCliente
    ? clientiTutti.filter(c => c.nome.toLowerCase().includes(cercaCliente.toLowerCase())).slice(0, 5)
    : [];

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
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <DateHeader />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-black">
          Home
        </h1>
      </div>

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

      {/* Widget Ricerca Cliente */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-8">
        <h2 className="font-bold text-base mb-3 flex items-center gap-2">
          <Users size={18} className="text-violet-500" />
          Cerca Cliente
        </h2>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={cercaRef}
            type="text"
            placeholder="Nome cliente..."
            value={cercaCliente}
            onChange={(e) => { setCercaCliente(e.target.value); setShowClientiDropdown(true); }}
            onFocus={() => setShowClientiDropdown(true)}
            onBlur={() => setTimeout(() => setShowClientiDropdown(false), 150)}
            className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          />
          {cercaCliente && (
            <button
              onClick={() => { setCercaCliente(''); setShowClientiDropdown(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          )}
          {showClientiDropdown && clientiFiltrati.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {clientiFiltrati.map(cliente => (
                <button
                  key={cliente.id}
                  onMouseDown={() => navigate(`/clienti/${cliente.id}`)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between"
                >
                  <span className="font-medium">{cliente.nome}</span>
                  <ArrowUpRight size={16} className="text-slate-400" />
                </button>
              ))}
            </div>
          )}
          {showClientiDropdown && cercaCliente && clientiFiltrati.length === 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center text-slate-500 text-sm">
              Nessun cliente trovato
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-slate-100 text-center">
      </footer>
    </div>
  );
}
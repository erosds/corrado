import { Users, ShoppingCart, Factory, BarChart3, ArrowUpRight, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";

// --- Componenti UI Minimalisti (Senza shadcn) ---
const CustomCard = ({ children, className = "" }) => (
  <div className={`bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden ${className}`}>
    {children}
  </div>
);

const CustomButton = ({ children, onClick, className = "" }) => (
  <button 
    onClick={onClick}
    className={`px-6 py-3 rounded-2xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2 ${className}`}
  >
    {children}
  </button>
);

const menuItems = [
  { title: "Clienti", desc: "Anagrafica e contatti", icon: Users, color: "bg-blue-50 text-blue-600", stats: "1.2k" },
  { title: "Ordini", desc: "Storico e nuovi inserimenti", icon: ShoppingCart, color: "bg-emerald-50 text-emerald-600", stats: "+12" },
  { title: "Mulini", desc: "Gestione impianti fornitori", icon: Factory, color: "bg-orange-50 text-orange-600", stats: "8" },
  { title: "Statistiche", desc: "Report vendite", icon: BarChart3, color: "bg-purple-50 text-purple-600", stats: "Top" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] p-6 md:p-12 font-sans antialiased text-slate-900">
      
      {/* Header Sleek */}
      <header className="max-w-6xl mx-auto mb-16 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-3 text-slate-400">
            <LayoutDashboard size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Corrado Irlando</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight">Dashboard</h1>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm font-bold text-slate-800 uppercase tracking-tighter">10 Febbraio 2026</p>
          <div className="h-1 w-12 bg-slate-900 ml-auto mt-1" />
        </div>
      </header>

      {/* Grid Moderna */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {menuItems.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <CustomCard className="group hover:border-slate-300 transition-colors duration-500">
              <div className="p-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-12">
                  <div className={`p-5 rounded-3xl ${item.color} group-hover:rotate-6 transition-transform duration-300`}>
                    <item.icon size={32} strokeWidth={1.5} />
                  </div>
                  <span className="text-4xl font-black text-slate-100 group-hover:text-slate-200 transition-colors">
                    0{i + 1}
                  </span>
                </div>

                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
                  <p className="text-slate-500 leading-relaxed max-w-[200px]">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-10 flex items-center justify-between">
                  <span className="font-mono text-sm font-bold opacity-40 uppercase tracking-widest">
                    Stats: {item.stats}
                  </span>
                  <CustomButton className="bg-slate-900 text-white hover:pr-8 hover:bg-black group/btn relative overflow-hidden">
                    Entra
                    <ArrowUpRight size={18} className="transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
                  </CustomButton>
                </div>
              </div>
            </CustomCard>
          </motion.div>
        ))}
      </div>

      {/* Footer / Status Bar */}
      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-slate-200 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
        <span>System Status: Optimal</span>
        <span>© 2026</span>
      </footer>
    </div>
  );
}

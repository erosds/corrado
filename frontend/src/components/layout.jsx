import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  Home, Users, ShoppingCart, Factory, Truck, BarChart3,
  Menu, X, ChevronLeft
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/ordini', icon: ShoppingCart, label: 'Ordini' },
  { to: '/carichi', icon: Truck, label: 'Carichi' },
  { to: '/clienti', icon: Users, label: 'Clienti' },
  { to: '/mulini', icon: Factory, label: 'Mulini' },
  { to: '/trasportatori', icon: Truck, label: 'Trasportatori' },
  { to: '/statistiche', icon: BarChart3, label: 'Stats' },
];

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-[#f8f9fb] pb-20 md:pb-0">
      {/* Header Mobile */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100 md:hidden">
        <div className="flex items-center justify-between px-4 h-14">
          {!isHome ? (
            <button
              onClick={() => window.history.back()}
              className="p-2 -ml-2 text-slate-600"
            >
              <ChevronLeft size={24} />
            </button>
          ) : (
            <div className="font-bold text-sm tracking-tight">FlourManagement™</div>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 -mr-2 text-slate-600"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Menu Dropdown Mobile */}
        {menuOpen && (
          <div className="absolute top-14 left-0 right-0 bg-white border-b border-slate-200 shadow-lg">
            <nav className="p-4 space-y-2">
              {[...navItems].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                    }`
                  }
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-100 p-6">
        <div className="mb-10">
          <h1 className="font-black text-xl tracking-tight">FlourManagement™</h1>
          <p className="text-xs text-slate-400 font-medium">Corrado Irlando</p>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">v1.0.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64">
        <Outlet />
      </main>
    </div>
  );
}
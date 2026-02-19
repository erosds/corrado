import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  Home, Users, ShoppingCart, Factory, Truck,
  Menu, X, ChevronLeft, Receipt, LogOut, KeyRound
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import flourBw from '../assets/flour-2.png';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/carichi', icon: Truck, label: 'Planner' },
  { to: '/ordini', icon: ShoppingCart, label: 'Ordini' },
  { to: '/clienti', icon: Users, label: 'Clienti' },
  { to: '/mulini', icon: Factory, label: 'Mulini' },
  { to: '/trasportatori', icon: Truck, label: 'Trasportatori' },
  { to: '/pagamenti', icon: Receipt, label: 'Pagamenti' },
];

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', next: '' });
  const [pwdMsg, setPwdMsg] = useState({ text: '', error: false });
  const [pwdLoading, setPwdLoading] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { logout } = useAuth();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdMsg({ text: '', error: false });
    try {
      await api.put('/auth/password', {
        current_password: pwdForm.current,
        new_password: pwdForm.next,
      });
      setPwdMsg({ text: 'Password aggiornata', error: false });
      setPwdForm({ current: '', next: '' });
      setTimeout(() => setShowPwdModal(false), 1200);
    } catch {
      setPwdMsg({ text: 'Password attuale non corretta', error: true });
    } finally {
      setPwdLoading(false);
    }
  };

  const openPwdModal = () => {
    setPwdForm({ current: '', next: '' });
    setPwdMsg({ text: '', error: false });
    setShowPwdModal(true);
  };

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
            <div className="flex items-center gap-2">
                <img src={flourBw} alt="" className="w-6 h-6 object-contain" />
                <span className="font-bold text-sm tracking-tight">FlourManagement™</span>
              </div>
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
              <button
                onClick={() => { setMenuOpen(false); openPwdModal(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors w-full"
              >
                <KeyRound size={20} />
                <span className="font-medium">Cambia password</span>
              </button>
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors w-full"
              >
                <LogOut size={20} />
                <span className="font-medium">Esci</span>
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-100 p-6">
        <div className="mb-5">
          <img src="/flour.png" alt="Logo" className="w-12 h-12 object-contain" />
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

        <div className="pt-4 border-t border-slate-100 space-y-3">
          <button
            onClick={openPwdModal}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <KeyRound size={16} />
            <span>Cambia password</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            <span>Esci</span>
          </button>
          <p className="text-xs text-slate-400">v1.0.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64">
        <Outlet />
      </main>

      {/* Modal Cambia Password */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <form
            onSubmit={handleChangePassword}
            className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-sm space-y-4"
          >
            <h2 className="font-bold text-lg text-slate-900">Cambia password</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password attuale
              </label>
              <input
                type="password"
                value={pwdForm.current}
                onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nuova password
              </label>
              <input
                type="password"
                value={pwdForm.next}
                onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                required
              />
            </div>
            {pwdMsg.text && (
              <p className={`text-sm text-center ${pwdMsg.error ? 'text-red-500' : 'text-green-600'}`}>
                {pwdMsg.text}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPwdModal(false)}
                className="flex-1 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={pwdLoading}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {pwdLoading ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
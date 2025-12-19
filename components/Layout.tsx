import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { logout } from '../store/authSlice';
import { supabase } from '../services/supabase';
import { LayoutDashboard, LogOut, Settings, Network, UserCog, LayoutGrid, Shield } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch(logout());
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  // Configuração de visibilidade dos itens
  // Dashboard, Users e Proxies só aparecem se isAdmin for true
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, requiredAdmin: true },
    { name: 'Gerenciar Usuários', path: '/users', icon: UserCog, requiredAdmin: true },
    { name: 'Proxies & Fingerprints', path: '/proxies', icon: Network, requiredAdmin: true },
    { name: 'Grupos e Apps', path: '/profiles', icon: LayoutGrid, requiredAdmin: false },
    { name: '2FA Compartilhado', path: '/2fa', icon: Shield, requiredAdmin: false },
  ];

  // Filtra itens com base na role
  const visibleItems = navItems.filter(item => {
    if (item.requiredAdmin && !isAdmin) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-dark-800 border-r border-dark-700 flex flex-col h-screen fixed z-20">
        <div className="p-8 border-b border-dark-700 flex items-center justify-center">
          <h1 className="text-3xl font-black tracking-tighter select-none drop-shadow-sm">
            <span className="bg-gradient-to-br from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">NINJA</span>
            <span className="bg-gradient-to-br from-ninja-400 to-ninja-600 bg-clip-text text-transparent">BR</span>
          </h1>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium
                  ${isActive
                    ? 'bg-ninja-600/10 text-ninja-500 border border-ninja-600/20'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-dark-700'}
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-ninja-500' : 'text-zinc-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer Navigation & Profile */}
        <div className="p-4 border-t border-dark-700 space-y-4">

          {/* Settings Link - Visible to Everyone */}
          <Link
            to="/settings"
            className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium
            ${location.pathname === '/settings'
                ? 'bg-dark-700 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-dark-700'}
            `}
          >
            <Settings className="h-5 w-5" />
            Configurações
          </Link>

          {/* User Profile */}
          <div className="pt-2 border-t border-dark-700/50">
            <div className="flex items-center gap-3 mb-3 px-2">
              <img
                src={`https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${user?.email}`}
                alt="Admin Avatar"
                className="h-9 w-9 rounded-full bg-dark-900 border border-dark-600"
              />
              <div className="overflow-hidden">
                <p className="text-xs text-zinc-500 uppercase">
                  {isAdmin ? 'Administrador' : 'Usuário'}
                </p>
                <p className="text-sm font-medium text-zinc-200 truncate w-32" title={user?.email}>
                  {user?.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 hover:text-red-300 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, Layers, Flame, ClipboardList,
  Factory, BarChart2, TrendingDown, LogOut, Menu,
  FileBarChart, ShieldCheck, ChevronDown, ChevronRight,
  Settings, Anvil, Wrench, Hammer, Scissors, Package, ChevronUp
} from 'lucide-react';

interface NavItem { to: string; label: string; icon: React.ElementType; modulo?: string; }
interface NavGroup { label: string; items: NavItem[]; subgroup?: { label: string; items: NavItem[] } }

const OP_ITEMS: NavItem[] = [
  { to: '/desbaste',     label: 'Desbaste',   icon: Hammer,   modulo: 'lancamentos' },
  { to: '/laminacao-op', label: 'Laminação',  icon: Layers,   modulo: 'lancamentos' },
  { to: '/corte',        label: 'Corte',      icon: Scissors, modulo: 'lancamentos' },
  { to: '/expedicao',    label: 'Expedição',  icon: Package,  modulo: 'lancamentos' },
];

const NAV: NavGroup[] = [
  {
    label: 'Visão Geral',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Cadastros',
    items: [
      { to: '/clientes', label: 'Clientes', icon: Users,  modulo: 'clientes' },
      { to: '/chapas',   label: 'Chapas',   icon: Layers, modulo: 'chapas'   },
      { to: '/estufas',  label: 'Estufas',  icon: Flame,  modulo: 'estufas'  },
    ],
  },
  {
    label: 'Produção',
    items: [
      { to: '/ordens',    label: 'Ordens de Serviço', icon: ClipboardList, modulo: 'ordens'    },
      { to: '/fundicao',  label: 'Fundição',           icon: Anvil,         modulo: 'fundicao'  },
      { to: '/laminacao', label: 'Laminação (Prod.)',  icon: Factory,       modulo: 'laminacao' },
      { to: '/perdas',    label: 'Perdas',             icon: TrendingDown,  modulo: 'perdas'    },
    ],
  },
  {
    label: 'Manutenção',
    items: [{ to: '/manutencao', label: 'Manutenção', icon: Wrench, modulo: 'manutencao' }],
  },
  {
    label: 'Análise',
    items: [
      { to: '/eficiencia', label: 'Eficiência',  icon: BarChart2,    modulo: 'eficiencia' },
      { to: '/relatorios', label: 'Relatórios',  icon: FileBarChart, modulo: 'relatorios' },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/clientes':     'Clientes',
  '/chapas':       'Chapas',
  '/estufas':      'Estufas',
  '/ordens':       'Ordens de Serviço',
  '/lancamentos':  'Histórico Lançamentos',
  '/desbaste':     'Desbaste',
  '/laminacao-op': 'Laminação',
  '/corte':        'Corte',
  '/expedicao':    'Expedição',
  '/fundicao':     'Fundição',
  '/laminacao':    'Laminação (Prod.)',
  '/eficiencia':   'Eficiência',
  '/relatorios':   'Relatórios',
  '/perdas':       'Perdas',
  '/manutencao':   'Manutenção',
  '/usuarios':     'Usuários',
  '/auditoria':    'Auditoria',
};

const OP_COLORS: Record<string,string> = {
  '/desbaste':     '#4f46e5',
  '/laminacao-op': '#7c3aed',
  '/corte':        '#d97706',
  '/expedicao':    '#059669',
};

const SIDEBAR_W = 224;

export default function Layout() {
  const { user, logout, isAdmin, podeVer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed]       = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [opsOpen, setOpsOpen]           = useState(true);

  const handleLogout = () => { logout(); navigate('/login'); };

  const canAccess = (item: NavItem) => {
    if (!item.modulo) return true;
    return podeVer(item.modulo);
  };

  const currentTitle = PAGE_TITLES[location.pathname] || '';
  const currentColor = OP_COLORS[location.pathname];

  return (
    <div className="flex min-h-screen bg-[#f5f5f4]">
      {/* Sidebar */}
      <aside className="sidebar select-none transition-all duration-200" style={{ width: collapsed ? 64 : SIDEBAR_W }}>

        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-14 flex-shrink-0 border-b border-white/6">
          {!collapsed && <span className="text-white font-bold text-[15px] tracking-tight">GestãoPro</span>}
          <button onClick={() => setCollapsed(c => !c)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/6 transition-all ml-auto">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {NAV.map(group => {
            const visibleItems = group.items.filter(canAccess);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label}>
                {!collapsed && <p className="sidebar-section">{group.label}</p>}
                {visibleItems.map(item => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0 py-3' : ''}`}
                    title={collapsed ? item.label : undefined}>
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}

                {/* Inline Operações group under Produção */}
                {group.label === 'Produção' && !collapsed && (
                  <div>
                    <button onClick={() => setOpsOpen(o => !o)}
                      className="sidebar-item w-full flex items-center gap-2 text-slate-400 hover:text-slate-300 mt-0.5">
                      <Factory className="w-4 h-4 flex-shrink-0 text-slate-500" />
                      <span className="flex-1 text-left text-[11px] font-bold uppercase tracking-wider">Operações</span>
                      {opsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {opsOpen && (
                      <div className="ml-3 border-l border-white/8 pl-2 space-y-0.5 mt-0.5">
                        {OP_ITEMS.filter(canAccess).map(item => {
                          const clr = OP_COLORS[item.to];
                          return (
                            <NavLink key={item.to} to={item.to}
                              className={({ isActive }) => `sidebar-item text-[12px] ${isActive ? 'active' : ''}`}
                              title={item.label}>
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: clr }} />
                              <span>{item.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {group.label === 'Produção' && collapsed && (
                  <div className="space-y-0.5">
                    {OP_ITEMS.filter(canAccess).map(item => {
                      const clr = OP_COLORS[item.to];
                      return (
                        <NavLink key={item.to} to={item.to}
                          className={({ isActive }) => `sidebar-item justify-center px-0 py-3 ${isActive ? 'active' : ''}`}
                          title={item.label}>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: clr }} />
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Sistema */}
          {isAdmin && (
            <div>
              {!collapsed && <p className="sidebar-section">Sistema</p>}
              {[
                { to: '/usuarios',  label: 'Usuários',  icon: Settings    },
                { to: '/auditoria', label: 'Auditoria', icon: ShieldCheck },
              ].map(item => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0 py-3' : ''}`}
                  title={collapsed ? item.label : undefined}>
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* User area */}
        <div className="border-t border-white/6 px-2 py-3 flex-shrink-0">
          <button onClick={() => setUserMenuOpen(o => !o)}
            className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/6 transition-all ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.nome.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{user?.nome}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{user?.perfil}</p>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
          {userMenuOpen && !collapsed && (
            <button onClick={handleLogout}
              className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-xs font-medium">
              <LogOut className="w-3.5 h-3.5" />Sair do sistema
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0" style={{ marginLeft: collapsed ? 64 : SIDEBAR_W }}>
        <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-slate-200/80 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">GestãoPro</span>
            {currentTitle && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <div className="flex items-center gap-1.5">
                  {currentColor && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentColor }} />}
                  <span className="font-semibold text-slate-700">{currentTitle}</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:block">{user?.nome}</span>
            <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
              {user?.nome.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}

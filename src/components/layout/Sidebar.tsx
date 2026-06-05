import React from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, Receipt,
  Users, FileText, TrendingUp, Menu, X, Sun, Moon, LogOut,
  RefreshCw, Bell, ChevronRight, Settings, Layers, Download, UserCog
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useBusinessData } from '../../contexts/BusinessDataContext';
import { Spinner } from '../ui/Common';
import { usePwaInstall } from '../../lib/usePwaInstall';
import { allowedPages, ROLE_LABELS } from '../../lib/permissions';

export type Page =
  | 'dashboard' | 'inventory' | 'sales' | 'expenses'
  | 'credits' | 'reports' | 'analytics' | 'customers'
  | 'stock-summary' | 'settings' | 'top-selling' | 'staff-management';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  page: Page;
  onNavigate: (p: Page) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const ALL_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'inventory', label: 'Inventory', icon: <Package size={18} /> },
  { id: 'stock-summary', label: 'Stock Summary', icon: <Layers size={18} /> },
  { id: 'sales', label: 'Sales', icon: <ShoppingCart size={18} /> },
  { id: 'expenses', label: 'Expenses', icon: <Receipt size={18} /> },
  { id: 'customers', label: 'Customers', icon: <Users size={18} /> },
  { id: 'credits', label: 'Credits', icon: <FileText size={18} /> },
  { id: 'top-selling', label: 'Top Selling', icon: <TrendingUp size={18} /> },
  { id: 'reports', label: 'Reports', icon: <FileText size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={18} /> },
];

export function Sidebar({ page, onNavigate, mobileOpen, onMobileClose }: SidebarProps) {
  const { session, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { products, syncing, refresh } = useBusinessData();
  const { canInstall, install } = usePwaInstall();

  const lowStock = products.filter(p => p.quantity <= 5 && p.quantity > 0).length;
  const outOfStock = products.filter(p => p.quantity === 0).length;
  const stockBadge = lowStock + outOfStock || undefined;

  const allowed = allowedPages(session?.role ?? 'staff', session?.staffRole);
  const nav: NavItem[] = ALL_NAV
    .filter(item => allowed.includes(item.id))
    .map(item => item.id === 'inventory' ? { ...item, badge: stockBadge } : item);

  const displayName = session?.role === 'owner' ? 'Owner' : (session?.staffName ?? 'Staff');
  const roleLabel = session?.role === 'owner'
    ? ROLE_LABELS.owner
    : ROLE_LABELS[session?.staffRole ?? 'cashier'];

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl shadow-md overflow-hidden bg-white">
          <img src="/Bright_logo.png" alt="TRΛXXO" className="w-10 h-10 object-cover" onError={e => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.parentElement as HTMLElement).classList.add('bg-blue-600');
          }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">TR<span className="font-black">Λ</span>XXO</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{session?.businessName}</div>
        </div>
        <button onClick={onMobileClose} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(item => (
          <button
            key={item.id}
            onClick={() => { onNavigate(item.id); onMobileClose(); }}
            className={`w-full ${page === item.id ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge ? (
              <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            ) : page === item.id ? (
              <ChevronRight size={14} className="opacity-60" />
            ) : null}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100 dark:border-gray-700 space-y-1">
        <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-2">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{displayName}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">{roleLabel}</div>
        </div>

        <button onClick={refresh} disabled={syncing} className="sidebar-link-inactive w-full">
          {syncing ? <Spinner size="sm" /> : <RefreshCw size={16} />}
          <span className="flex-1 text-left">{syncing ? 'Syncing…' : 'Sync Data'}</span>
        </button>

        {session?.role === 'owner' && (
          <button onClick={() => { onNavigate('staff-management'); onMobileClose(); }} className={`w-full ${page === 'staff-management' ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}>
            <UserCog size={16} />
            <span className="flex-1 text-left">Staff</span>
          </button>
        )}

        <button onClick={() => { onNavigate('settings'); onMobileClose(); }} className={`w-full ${page === 'settings' ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}>
          <Settings size={16} />
          <span className="flex-1 text-left">Settings</span>
        </button>
        <button onClick={toggle} className="sidebar-link-inactive w-full">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span className="flex-1 text-left">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        {canInstall && (
          <button onClick={install} className="sidebar-link-inactive w-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            <Download size={16} />
            <span className="flex-1 text-left">Install App</span>
          </button>
        )}
        <button onClick={logout} className="sidebar-link-inactive w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
          <LogOut size={16} />
          <span className="flex-1 text-left">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 sticky top-0">
        {content}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="relative w-60 h-full bg-white dark:bg-gray-800 slide-in-left shadow-xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

interface HeaderProps {
  title: string;
  onMenuOpen: () => void;
  actions?: React.ReactNode;
}

export function Header({ title, onMenuOpen, actions }: HeaderProps) {
  const { products, syncing } = useBusinessData();
  const lowStock = products.filter(p => p.quantity <= 5).length;

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3 px-4 h-14">
        <button onClick={onMenuOpen} className="lg:hidden btn-icon btn-secondary">
          <Menu size={18} />
        </button>
        <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex-1">{title}</h1>
        {syncing && <Spinner size="sm" />}
        {lowStock > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <Bell size={13} className="text-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{lowStock} low stock</span>
          </div>
        )}
        {actions}
      </div>
    </header>
  );
}

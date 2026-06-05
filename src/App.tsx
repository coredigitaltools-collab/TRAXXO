import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { BusinessDataProvider } from './contexts/BusinessDataContext';
import { LoginPage } from './components/LoginPage';
import { Sidebar, Header, type Page } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { InventoryPage } from './pages/InventoryPage';
import { SalesPage } from './pages/SalesPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { CreditsPage } from './pages/CreditsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CustomerManagementPage } from './pages/CustomerManagementPage';
import { StockSummaryPage } from './pages/StockSummaryPage';
import { SettingsPage } from './pages/SettingsPage';
import { TopSellingProductsPage } from './pages/TopSellingProductsPage';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { canAccess } from './lib/permissions';

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  sales: 'Sales',
  expenses: 'Expenses',
  credits: 'Credits',
  reports: 'Reports',
  analytics: 'Analytics',
  customers: 'Customers',
  'stock-summary': 'Stock Summary',
  settings: 'Settings',
  'top-selling': 'Top Selling Products',
  'staff-management': 'Staff Management',
};

function AppContent() {
  const { session } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!session) return <LoginPage />;

  const navigate = (p: Page) => {
    if (canAccess(p, session.role, session.staffRole)) setPage(p);
  };

  const renderPage = () => {
    if (!canAccess(page, session.role, session.staffRole)) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-24 text-center px-4">
          <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-2xl text-gray-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Access Restricted</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">Your role does not have permission to view this page. Contact the business owner.</p>
        </div>
      );
    }
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <InventoryPage onBack={() => navigate('dashboard')} />;
      case 'sales': return <SalesPage onBack={() => navigate('dashboard')} />;
      case 'expenses': return <ExpensesPage onBack={() => navigate('dashboard')} />;
      case 'credits': return <CreditsPage onBack={() => navigate('dashboard')} />;
      case 'reports': return <ReportsPage onBack={() => navigate('dashboard')} />;
      case 'analytics': return <AnalyticsPage onBack={() => navigate('dashboard')} />;
      case 'customers': return <CustomerManagementPage onBack={() => navigate('dashboard')} />;
      case 'stock-summary': return <StockSummaryPage onBack={() => navigate('inventory')} />;
      case 'settings': return <SettingsPage onBack={() => navigate('dashboard')} onNavigateToStaff={() => navigate('staff-management')} />;
      case 'top-selling': return <TopSellingProductsPage onBack={() => navigate('dashboard')} />;
      case 'staff-management': return <StaffManagementPage onBack={() => navigate('settings')} />;
    }
  };

  return (
    <BusinessDataProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        <Sidebar
          page={page}
          onNavigate={navigate}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            title={PAGE_TITLES[page]}
            onMenuOpen={() => setMobileOpen(true)}
          />
          <main className="flex-1 overflow-y-auto">
            {renderPage()}
          </main>
        </div>
      </div>
    </BusinessDataProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

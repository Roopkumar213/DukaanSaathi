import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './store';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ToastContainer from './components/Toast';
import SearchOverlay from './components/SearchOverlay';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import SaleDetail from './pages/SaleDetail';
import Inventory, { ProductDetail, AddProduct } from './pages/Inventory';
import Khata, { CustomerDetail } from './pages/Khata';
import Payments from './pages/Payments';
import AIAssistant from './pages/AIAssistant';
import Activity from './pages/Activity';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function AppContent() {
  const { page } = useApp();

  const pages: Record<string, React.ReactNode> = {
    overview: <Dashboard />,
    sales: <Sales />,
    'sale-detail': <SaleDetail />,
    inventory: <Inventory />,
    'product-detail': <ProductDetail />,
    'add-product': <AddProduct />,
    khata: <Khata />,
    'customer-detail': <CustomerDetail />,
    payments: <Payments />,
    'ai-assistant': <AIAssistant />,
    activity: <Activity />,
    settings: <Settings />,
    'terms-of-service': <TermsOfService />,
    'privacy-policy': <PrivacyPolicy />,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {pages[page] ?? <Dashboard />}
        </main>
      </div>
      <SearchOverlay />
      <ToastContainer />
    </div>
  );
}

function MainRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#4338CA] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#6B7280]">Loading DukaanAI...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === 'register') {
      return <Register onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <Login onSwitchToRegister={() => setAuthView('register')} />;
  }

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="*" element={<MainRouter />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

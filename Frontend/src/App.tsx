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
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FA]">
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

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

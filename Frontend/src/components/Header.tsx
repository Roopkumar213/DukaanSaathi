import { useApp } from '../store';

const pageTitles: Record<string, string> = {
  overview: 'Overview',
  sales: 'Sales',
  'sale-detail': 'Sale Details',
  inventory: 'Inventory',
  'product-detail': 'Product',
  'add-product': 'Add Product',
  'upload-stock': 'Upload Stock',
  khata: 'Khata',
  'customer-detail': 'Customer',
  payments: 'Payments',
  'ai-assistant': 'AI Assistant',
  activity: 'Activity',
  settings: 'Settings',
};

export default function Header() {
  const { page, notifications, setSearchOpen } = useApp();

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[#E5E7EB] bg-white sticky top-0 z-20">
      <h2 className="text-[15px] font-semibold text-[#111827]">{pageTitles[page] ?? page}</h2>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[9px] border border-[#E5E7EB] text-[#9CA3AF] text-sm hover:border-[#C7D2FE] hover:text-[#4338CA] transition-colors"
        >
          <SearchIcon />
          <span className="hidden sm:inline">Search</span>
          <span className="hidden md:inline text-xs bg-[#F3F4F6] px-1.5 py-0.5 rounded-[5px] text-[#9CA3AF]">⌘K</span>
        </button>
        <NotifButton count={notifications} />
        <div className="w-8 h-8 rounded-full bg-[#4338CA] flex items-center justify-center text-white text-xs font-semibold cursor-pointer">RK</div>
      </div>
    </header>
  );
}

function NotifButton({ count }: { count: number }) {
  return (
    <button className="relative w-9 h-9 flex items-center justify-center rounded-[9px] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2a5 5 0 0 1 5 5v3l1.5 2.5H2.5L4 10V7a5 5 0 0 1 5-5z" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M7 14.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      {count > 0 && (
        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#DC2626] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

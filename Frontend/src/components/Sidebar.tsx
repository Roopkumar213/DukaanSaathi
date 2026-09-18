import { useApp, Page } from '../store';

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <GridIcon /> },
  { id: 'sales', label: 'Sales', icon: <ShoppingIcon /> },
  { id: 'inventory', label: 'Inventory', icon: <BoxIcon /> },
  { id: 'khata', label: 'Khata', icon: <BookIcon /> },
  { id: 'payments', label: 'Payments', icon: <WalletIcon /> },
  { id: 'ai-assistant', label: 'AI Assistant', icon: <SparkleIcon /> },
  { id: 'activity', label: 'Activity', icon: <ClockIcon /> },
];

export default function Sidebar() {
  const { page, navigate } = useApp();

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-screen sticky top-0" style={{ background: '#1E1B4B' }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-[#4338CA] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
              <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
              <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
              <rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-[15px] leading-tight">DukaanAI</p>
            <p className="text-[#818CF8] text-[10px] leading-tight mt-0.5">Shop Assistant</p>
          </div>
        </div>
      </div>

      {/* Shop info */}
      <div className="mx-3 mb-4 px-3 py-2.5 rounded-[10px]" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <p className="text-white text-xs font-medium truncate">Ravi's Kirana Store</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] flex-shrink-0" />
          <span className="text-[#818CF8] text-[11px]">Synced</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-sm font-medium transition-all duration-150 cursor-pointer text-left
              ${page === item.id
                ? 'bg-[#312E81] text-white'
                : 'text-[#A5B4FC] hover:bg-white/5 hover:text-white'
              }`}
          >
            <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 mt-2 flex flex-col gap-0.5">
        <button
          onClick={() => navigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-sm font-medium transition-all duration-150 cursor-pointer text-left
            ${page === 'settings' ? 'bg-[#312E81] text-white' : 'text-[#A5B4FC] hover:bg-white/5 hover:text-white'}`}
        >
          <span className="w-4 h-4 flex-shrink-0"><SettingsIcon /></span>
          Settings
        </button>
        <div className="mt-2 px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#4338CA] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">RK</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">Ravi Kumar</p>
            <p className="text-[#818CF8] text-[11px] truncate">Owner</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function GridIcon() {
  return <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/></svg>;
}
function ShoppingIcon() {
  return <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><path d="M2 2h1.5l1.5 7h7l1.5-5H4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="6.5" cy="12.5" r="1" fill="currentColor"/><circle cx="11.5" cy="12.5" r="1" fill="currentColor"/></svg>;
}
function BoxIcon() {
  return <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><path d="M2 5l6-3 6 3v6l-6 3-6-3V5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 2v12M2 5l6 3 6-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function BookIcon() {
  return <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><path d="M3 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3"/><path d="M5 5h5M5 8h5M5 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
}
function WalletIcon() {
  return <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 7h14" stroke="currentColor" strokeWidth="1.2"/><circle cx="11.5" cy="10" r="1" fill="currentColor"/><path d="M4 2h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
function SparkleIcon() {
  return <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><path d="M8 2l1.2 3.8L13 7 9.2 8.2 8 12 6.8 8.2 3 7l3.8-1.2L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="currentColor" opacity="0.3"/><path d="M13 11l.5 1.5L15 13l-1.5.5L13 15l-.5-1.5L11 13l1.5-.5L13 11z" fill="currentColor" opacity="0.7"/></svg>;
}
function ClockIcon() {
  return <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function SettingsIcon() {
  return <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}

import { useState } from 'react';
import { useApp, Page } from '../store';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS: { id: Page; key: string; icon: React.ReactNode }[] = [
  { id: 'overview',      key: 'nav.overview',     icon: <DashboardIcon /> },
  { id: 'sales',         key: 'nav.sales',        icon: <SalesIcon /> },
  { id: 'inventory',     key: 'nav.inventory',    icon: <BoxIcon /> },
  { id: 'khata',         key: 'nav.khata',        icon: <BookIcon /> },
  { id: 'payments',      key: 'nav.payments',     icon: <WalletIcon /> },
  { id: 'ai-assistant',  key: 'nav.aiAssistant',  icon: <ChatIcon /> },
  { id: 'activity',      key: 'nav.activity',     icon: <ClockIcon /> },
];

export default function Sidebar() {
  const { page, navigate } = useApp();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'DK';

  const shopDisplay = user?.shopName || '';

  const SidebarContent = () => (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-full" style={{ background: '#0F172A' }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[7px] bg-[#1E40AF] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
              <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
              <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
              <rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-[15px] leading-tight">{t('common.appName')}</p>
            <p className="text-[#64748B] text-[10px] leading-tight mt-0.5">{t('common.tagline')}</p>
          </div>
        </div>
      </div>

      {/* Shop info — only shown if shop name exists */}
      {shopDisplay && (
        <div className="mx-3 mb-4 px-3 py-2.5 rounded-[9px]" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <p className="text-white text-xs font-medium truncate">{shopDisplay}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] flex-shrink-0" aria-hidden="true" />
            <span className="text-[#64748B] text-[11px]">{t('common.online')}</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 flex flex-col gap-0.5 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => { navigate(item.id); setMobileOpen(false); }}
            aria-current={page === item.id ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-medium transition-all duration-150 cursor-pointer text-left
              ${page === item.id
                ? 'bg-[#1E3A5F] text-white'
                : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
              }`}
          >
            <span className="w-4 h-4 flex-shrink-0" aria-hidden="true">{item.icon}</span>
            {t(item.key)}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 mt-2 flex flex-col gap-0.5">
        <button
          onClick={() => { navigate('settings'); setMobileOpen(false); }}
          aria-current={page === 'settings' ? 'page' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-medium transition-all duration-150 cursor-pointer text-left
            ${page === 'settings' ? 'bg-[#1E3A5F] text-white' : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'}`}
        >
          <span className="w-4 h-4 flex-shrink-0" aria-hidden="true"><SettingsIcon /></span>
          {t('nav.settings')}
        </button>
        <div className="mt-2 px-3 py-2 flex items-center justify-between gap-2 rounded-[9px]" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#1E40AF] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.fullName || t('common.shopOwner')}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title={t('nav.signOut')}
            aria-label={t('nav.signOut')}
            className="text-[#64748B] hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-screen sticky top-0">
        <SidebarContent />
      </div>

      {/* Mobile: hamburger button */}
      <div className="md:hidden fixed top-0 left-0 z-40">
        <button
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Open navigation menu"
          className="m-3 w-9 h-9 flex items-center justify-center rounded-[8px] bg-[#0F172A] text-white"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 mobile-nav-overlay" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[220px] h-full animate-slide-up">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function DashboardIcon() {
  return <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/></svg>;
}
function SalesIcon() {
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
// Chat icon replaces SparkleIcon (anti-pattern)
function ChatIcon() {
  return <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><path d="M2 2h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-3 3v-3H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M5 6h6M5 8.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
}
function ClockIcon() {
  return <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function SettingsIcon() {
  return <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}

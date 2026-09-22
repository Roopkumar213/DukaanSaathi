import { useApp } from '../store';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './ui';

export default function Header() {
  const { page, notifications, setSearchOpen, navigate } = useApp();
  const { user } = useAuth();
  const { t } = useTranslation();

  const pageTitleKeys: Record<string, string> = {
    overview:          'nav.overview',
    sales:             'nav.sales',
    'sale-detail':     'nav.saleDetail',
    inventory:         'nav.inventory',
    'product-detail':  'nav.productDetail',
    'add-product':     'nav.addProduct',
    'upload-stock':    'nav.uploadStock',
    khata:             'nav.khata',
    'customer-detail': 'nav.customerDetail',
    payments:          'nav.payments',
    'ai-assistant':    'nav.aiAssistant',
    activity:          'nav.activity',
    settings:          'nav.settings',
    'terms-of-service':'nav.termsOfService',
    'privacy-policy':  'nav.privacyPolicy',
  };

  const initials = (user?.fullName || user?.shopName || 'DK')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const titleKey = pageTitleKeys[page];
  const pageTitle = titleKey ? t(titleKey, { defaultValue: page }) : page;

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-[#E2E8F0] bg-white sticky top-0 z-20">
      {/* Left: page title (hidden on mobile to make room for hamburger) */}
      <h2 className="text-[15px] font-semibold text-[#0F172A] hidden md:block">{pageTitle}</h2>

      {/* Mobile spacer for hamburger button */}
      <div className="w-12 md:hidden" aria-hidden="true" />

      {/* Right: search + language + notifications + avatar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          aria-label={t('common.search')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[7px] border border-[#E2E8F0] text-[#94A3B8] text-sm hover:border-[#CBD5E1] hover:text-[#475569] transition-colors"
        >
          <SearchIcon />
          <span className="hidden sm:inline text-[#94A3B8]">{t('common.search')}</span>
          <span className="hidden md:inline text-xs bg-[#F1F5F9] px-1.5 py-0.5 rounded text-[#94A3B8]">⌘K</span>
        </button>

        {/* Language selector */}
        <div className="hidden sm:block">
          <LanguageSelector compact />
        </div>

        {/* Notifications */}
        <NotifButton count={notifications} />

        {/* Avatar → settings */}
        <button
          onClick={() => navigate('settings')}
          title={user?.fullName || user?.shopName || t('common.shopOwner')}
          aria-label={t('nav.settings')}
          className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center text-white text-xs font-semibold cursor-pointer hover:bg-[#1E293B] transition-colors flex-shrink-0"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}

function NotifButton({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <button
      className="relative w-9 h-9 flex items-center justify-center rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
      aria-label={count > 0 ? `${count} notifications` : t('common.notifications')}
    >
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
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

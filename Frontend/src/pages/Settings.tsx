import React, { useState } from 'react';
import { SectionHeader, Input, Button, Card, Divider } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../store';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, LangCode } from '../i18n/i18n';

export default function Settings() {
  const { user, logout } = useAuth();
  const { navigate, showToast } = useApp();
  const { t, i18n } = useTranslation();

  const [shopName, setShopName] = useState(user?.shopName || '');
  const [ownerName, setOwnerName] = useState(user?.fullName || '');
  const [email] = useState(user?.email || '');
  const [lang, setLang] = useState<LangCode>((i18n.language?.split('-')[0] as LangCode) || 'en');
  const [lowStockNotif, setLowStockNotif] = useState(true);
  const [paymentNotif, setPaymentNotif] = useState(true);
  const [khataNotif, setKhataNotif] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleLangChange(code: LangCode) {
    setLang(code);
    i18n.changeLanguage(code);
    // Persisted automatically via i18next-browser-languagedetector localStorage cache
  }

  function handleSave() {
    setSaved(true);
    showToast('success', t('settings.saved'));
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-[720px] mx-auto p-6 flex flex-col gap-6">
      <SectionHeader title={t('settings.title')} />

      {/* Shop Profile */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">{t('settings.storeProfile')}</h2>
        <Card padding="md" className="space-y-4">
          <Input
            label={t('settings.shopName')}
            value={shopName}
            onChange={e => setShopName(e.target.value)}
            placeholder="Your Store Name"
          />
          <Input
            label={t('settings.ownerName')}
            value={ownerName}
            onChange={e => setOwnerName(e.target.value)}
            placeholder="Owner Full Name"
          />
          <Input
            label={t('settings.email')}
            value={email}
            disabled
            className="bg-[#F8F9FA] text-[#64748B] cursor-not-allowed"
          />
        </Card>
      </div>

      {/* Preferences & AI Settings */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">{t('settings.aiLocalization')}</h2>
        <Card padding="md" className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#334155]">{t('settings.interfaceLanguage')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUPPORTED_LANGUAGES.map(({ code, nativeLabel }) => (
                <button
                  key={code}
                  onClick={() => handleLangChange(code as LangCode)}
                  type="button"
                  className={`py-2 px-3 rounded-[6px] text-xs font-medium border transition-colors cursor-pointer ${
                    lang === code
                      ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                      : 'bg-white text-[#334155] border-[#E2E8F0] hover:border-[#BFDBFE]'
                  }`}
                >
                  {nativeLabel}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#94A3B8]">{t('settings.languageNote')}</p>
          </div>

          <Divider />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#0F172A]">{t('settings.currency')}</p>
              <p className="text-xs text-[#64748B]">{t('settings.currencyNote')}</p>
            </div>
            <span className="text-xs font-semibold text-[#0F172A] bg-[#F8F9FA] border border-[#E2E8F0] px-3 py-1 rounded-[6px]">
              {t('settings.currencyValue')}
            </span>
          </div>

          <Divider />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#0F172A]">{t('settings.aiVerification')}</p>
              <p className="text-xs text-[#64748B]">{t('settings.aiVerificationNote')}</p>
            </div>
            <span className="text-xs font-semibold text-[#15803D] bg-[#DCFCE7] border border-[#BBF7D0] px-2.5 py-0.5 rounded-full">
              {t('settings.aiVerificationStatus')}
            </span>
          </div>
        </Card>
      </div>

      {/* Notifications */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">{t('settings.notifications')}</h2>
        <Card padding="md" className="space-y-1">
          {[
            { label: t('settings.notifLowStock'), sub: t('settings.notifLowStockDesc'), value: lowStockNotif, set: setLowStockNotif },
            { label: t('settings.notifPayment'), sub: t('settings.notifPaymentDesc'), value: paymentNotif, set: setPaymentNotif },
            { label: t('settings.notifKhata'), sub: t('settings.notifKhataDesc'), value: khataNotif, set: setKhataNotif },
          ].map(n => (
            <div key={n.label} className="flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-0">
              <div>
                <p className="text-sm font-medium text-[#0F172A]">{n.label}</p>
                <p className="text-xs text-[#64748B]">{n.sub}</p>
              </div>
              <button
                type="button"
                onClick={() => n.set(!n.value)}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                  n.value ? 'bg-[#1E40AF]' : 'bg-[#E2E8F0]'
                }`}
              >
                <span
                  className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    n.value ? 'translate-x-5.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </Card>
      </div>

      {/* Legal & Compliance */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">{t('settings.legal')}</h2>
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#0F172A]">{t('settings.termsOfService')}</p>
              <p className="text-xs text-[#64748B]">{t('settings.termsDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('terms-of-service')}
              className="text-xs font-semibold text-[#1E40AF] hover:text-[#1D4ED8] hover:underline cursor-pointer"
            >
              {t('settings.viewTerms')}
            </button>
          </div>

          <Divider />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#0F172A]">{t('settings.privacyPolicy')}</p>
              <p className="text-xs text-[#64748B]">{t('settings.privacyDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('privacy-policy')}
              className="text-xs font-semibold text-[#1E40AF] hover:text-[#1D4ED8] hover:underline cursor-pointer"
            >
              {t('settings.viewPrivacy')}
            </button>
          </div>
        </Card>
      </div>

      {/* Account Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" size="sm" onClick={logout} className="text-[#DC2626] hover:bg-[#FEE2E2] border-[#E2E8F0]">
          {t('settings.signOut')}
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave}>
          {saved ? t('settings.saved') : t('settings.savePreferences')}
        </Button>
      </div>
    </div>
  );
}

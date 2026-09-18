import { useState } from 'react';
import { SectionHeader, Input, Button, Card, Divider } from '../components/ui';

export default function Settings() {
  const [lang, setLang] = useState('en');
  const [shopName, setShopName] = useState("Ravi's Kirana Store");
  const [ownerName, setOwnerName] = useState('Ravi Kumar');
  const [phone, setPhone] = useState('98765 43210');
  const [lowStockNotif, setLowStockNotif] = useState(true);
  const [paymentNotif, setPaymentNotif] = useState(true);
  const [khataNotif, setKhataNotif] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-[680px] mx-auto p-6 flex flex-col gap-6">
      <SectionHeader title="Settings" />

      {/* Shop */}
      <div>
        <h2 className="text-base font-semibold text-[#374151] mb-3">Shop</h2>
        <Card padding="md" className="space-y-4">
          <Input label="Shop name" value={shopName} onChange={e => setShopName(e.target.value)} />
          <Input label="Owner name" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
          <Input label="Phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#374151]">Address</label>
            <textarea
              rows={2}
              placeholder="Shop address…"
              className="border border-[#E5E7EB] rounded-[10px] px-3 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] resize-none focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#EEF2FF]"
            />
          </div>
        </Card>
      </div>

      {/* Preferences */}
      <div>
        <h2 className="text-base font-semibold text-[#374151] mb-3">Preferences</h2>
        <Card padding="md" className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#374151]">Language</label>
            <div className="flex gap-2">
              {[['en', 'English'], ['te', 'తెలుగు'], ['hi', 'हिन्दी']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setLang(id)}
                  className={`flex-1 py-2 rounded-[8px] text-sm font-medium border transition-colors cursor-pointer
                    ${lang === id ? 'bg-[#4338CA] text-white border-[#4338CA]' : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#C7D2FE]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#9CA3AF]">You can speak naturally in your preferred language.</p>
          </div>
          <Divider />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#374151]">Currency</p>
              <p className="text-xs text-[#9CA3AF]">Used for all monetary displays</p>
            </div>
            <span className="text-sm font-semibold text-[#374151] bg-[#F3F4F6] px-3 py-1.5 rounded-[8px]">₹ INR</span>
          </div>
          <Divider />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#374151]">Confirmation before saving</p>
              <p className="text-xs text-[#9CA3AF]">Always review AI results before they update your data</p>
            </div>
            <div className="w-10 h-5.5 rounded-full bg-[#4338CA] flex items-center pl-0.5 cursor-pointer" style={{ height: 22 }}>
              <div className="w-4 h-4 rounded-full bg-white ml-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Notifications */}
      <div>
        <h2 className="text-base font-semibold text-[#374151] mb-3">Notifications</h2>
        <Card padding="md" className="space-y-1">
          {[
            { label: 'Low stock alerts', sub: 'When a product falls below minimum stock', value: lowStockNotif, set: setLowStockNotif },
            { label: 'Payment updates', sub: 'When payments are received or partially paid', value: paymentNotif, set: setPaymentNotif },
            { label: 'Khata reminders', sub: 'When customers have high outstanding balances', value: khataNotif, set: setKhataNotif },
          ].map(n => (
            <div key={n.label} className="flex items-center justify-between py-3 border-b border-[#F3F4F6] last:border-0">
              <div>
                <p className="text-sm font-medium text-[#374151]">{n.label}</p>
                <p className="text-xs text-[#9CA3AF]">{n.sub}</p>
              </div>
              <button
                onClick={() => n.set(!n.value)}
                className={`relative w-10 rounded-full transition-colors cursor-pointer flex-shrink-0`}
                style={{ height: 22, background: n.value ? '#4338CA' : '#D1D5DB' }}
              >
                <div
                  className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all"
                  style={{ width: 18, height: 18, left: n.value ? 'calc(100% - 20px)' : '2px', top: 2 }}
                />
              </button>
            </div>
          ))}
        </Card>
      </div>

      {/* Account */}
      <div>
        <h2 className="text-base font-semibold text-[#374151] mb-3">Account</h2>
        <Card padding="md" className="space-y-2">
          <div className="flex items-center gap-3 pb-3 border-b border-[#F3F4F6]">
            <div className="w-12 h-12 rounded-full bg-[#4338CA] flex items-center justify-center text-white font-semibold text-base">RK</div>
            <div>
              <p className="text-sm font-semibold text-[#111827]">{ownerName}</p>
              <p className="text-xs text-[#9CA3AF]">Owner · {shopName}</p>
            </div>
          </div>
          <button className="w-full text-left px-2 py-2.5 text-sm text-[#374151] hover:text-[#4338CA] transition-colors rounded-[8px] hover:bg-[#F7F8FA]">Change password →</button>
          <button className="w-full text-left px-2 py-2.5 text-sm text-[#DC2626] hover:bg-[#FEF2F2] transition-colors rounded-[8px]">Log out</button>
        </Card>
      </div>

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} variant={saved ? 'success' : 'primary'}>
          {saved ? '✓ Saved' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

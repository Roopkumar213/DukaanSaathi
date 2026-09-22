import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import { Link } from 'react-router-dom';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export default function Register({ onSwitchToLogin }: RegisterProps) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !shopName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        shopName: shopName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Email might already exist.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setShopName('Lakshmi Kirana & General Store');
    setFullName('Lakshmi Rao');
    setEmail(`tester_${Date.now().toString().slice(-4)}@dukaan.ai`);
    setPhone('9876543210');
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <div className="w-full max-w-[440px] bg-white rounded-[10px] border border-[#E2E8F0] p-8 flex flex-col gap-5">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-[8px] bg-[#1E40AF] flex items-center justify-center text-white font-bold text-sm mb-2.5">
            DA
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Create Store Account</h1>
          <p className="text-xs text-[#64748B] mt-1">Register your retail business for digital khata and sales management.</p>
        </div>

        {error && (
          <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-[8px] text-xs text-[#DC2626]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <Input
            label="Shop / Store Name *"
            placeholder="e.g. Balaji Provision Store"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
          />

          <Input
            label="Merchant Full Name *"
            placeholder="e.g. Suresh Patel"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address *"
              type="email"
              placeholder="suresh@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Phone (Optional)"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Input
            label="Password *"
            type="password"
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex flex-col gap-2 pt-1">
            <Button type="submit" size="md" variant="primary" loading={loading} className="w-full">
              Create Store &amp; Start
            </Button>
            <button
              type="button"
              onClick={handleFillDemo}
              className="w-full py-2.5 px-4 text-xs font-semibold text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] rounded-[8px] hover:bg-[#DBEAFE] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
              Fill Demo Details (Testing)
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-[#64748B] border-t border-[#F1F5F9] pt-3">
          Already registered?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[#1E40AF] font-semibold hover:text-[#1D4ED8] hover:underline cursor-pointer"
          >
            Sign in to existing store
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 text-[11px] text-[#94A3B8]">
          <Link to="/terms-of-service" className="hover:text-[#0F172A] underline">Terms of Service</Link>
          <span>&bull;</span>
          <Link to="/privacy-policy" className="hover:text-[#0F172A] underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}

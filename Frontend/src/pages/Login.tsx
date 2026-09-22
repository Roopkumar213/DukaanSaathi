import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import { Link } from 'react-router-dom';

interface LoginProps {
  onSwitchToRegister: () => void;
}

export default function Login({ onSwitchToRegister }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('demo@dukaan.ai');
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <div className="w-full max-w-[400px] bg-white rounded-[10px] border border-[#E2E8F0] p-8 flex flex-col gap-6">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-[8px] bg-[#1E40AF] flex items-center justify-center text-white font-bold text-sm mb-3">
            DA
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Merchant Portal</h1>
          <p className="text-xs text-[#64748B] mt-1">Sign in to manage your retail ledger and inventory.</p>
        </div>

        {error && (
          <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-[8px] text-xs text-[#DC2626]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="merchant@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex flex-col gap-2 pt-1">
            <Button type="submit" size="md" variant="primary" loading={loading} className="w-full">
              Sign In
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
        <div className="text-center text-xs text-[#64748B] border-t border-[#F1F5F9] pt-4">
          New retailer?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-[#1E40AF] font-semibold hover:text-[#1D4ED8] hover:underline cursor-pointer"
          >
            Register your shop
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

import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, LangCode } from '../i18n/i18n';

// ── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-[8px] transition-all duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-[15px]' };
  const variants = {
    primary:   'bg-[#1E40AF] text-white hover:bg-[#1D4ED8] active:bg-[#1e3a8a]',
    secondary: 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB] active:bg-[#F3F4F6]',
    ghost:     'text-[#374151] hover:bg-[#F3F4F6] active:bg-[#E5E7EB]',
    danger:    'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B]',
    success:   'bg-[#16A34A] text-white hover:bg-[#15803D] active:bg-[#166534]',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <Spinner size={14} color="currentColor" />}
      {children}
    </button>
  );
}

// ── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 18, color = '#1E40AF' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className="animate-spin-slow flex-shrink-0"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="7" stroke={color} strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M9 2a7 7 0 0 1 7 7" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Badge ───────────────────────────────────────────────────────────────────
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-[#F3F4F6] text-[#374151]',
    success: 'bg-[#DCFCE7] text-[#15803D]',
    warning: 'bg-[#FEF3C7] text-[#B45309]',
    error:   'bg-[#FEE2E2] text-[#B91C1C]',
    info:    'bg-[#EFF6FF] text-[#1E40AF]',
    outline: 'border border-[#E5E7EB] text-[#6B7280]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ── Input ───────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label htmlFor={inputId} className="text-sm font-medium text-[#374151]">{label}</label>}
        <div className="relative flex items-center">
          {prefix && <span className="absolute left-3 text-[#6B7280] text-sm pointer-events-none">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`w-full border border-[#E2E8F0] rounded-[8px] bg-white text-[#0F172A] text-sm px-3 py-2.5 placeholder-[#94A3B8] transition-colors
              focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#EFF6FF]
              disabled:bg-[#F8F9FA] disabled:text-[#94A3B8] disabled:cursor-not-allowed
              ${error ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#FEE2E2]' : ''}
              ${prefix ? 'pl-8' : ''}
              ${suffix ? 'pr-8' : ''}
              ${className}`}
            {...props}
          />
          {suffix && <span className="absolute right-3 text-[#6B7280] text-sm pointer-events-none">{suffix}</span>}
        </div>
        {error && <p className="text-xs text-[#DC2626]" role="alert">{error}</p>}
        {hint && !error && <p className="text-xs text-[#94A3B8]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ── Select ──────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({ label, error, className = '', children, id, ...props }: SelectProps) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={selectId} className="text-sm font-medium text-[#374151]">{label}</label>}
      <select
        id={selectId}
        className={`w-full border border-[#E2E8F0] rounded-[8px] bg-white text-[#0F172A] text-sm px-3 py-2.5 appearance-none cursor-pointer
          focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#EFF6FF]
          ${error ? 'border-[#DC2626]' : ''}
          ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-[#DC2626]" role="alert">{error}</p>}
    </div>
  );
}

// ── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', id, ...props }: TextareaProps) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={textareaId} className="text-sm font-medium text-[#374151]">{label}</label>}
      <textarea
        id={textareaId}
        className={`w-full border border-[#E2E8F0] rounded-[8px] bg-white text-[#0F172A] text-sm px-3 py-2.5 placeholder-[#94A3B8] resize-none
          focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#EFF6FF]
          ${error ? 'border-[#DC2626]' : ''}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[#DC2626]" role="alert">{error}</p>}
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', onClick, padding = 'md' }: CardProps) {
  const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };
  return (
    <div
      className={`bg-white border border-[#E2E8F0] rounded-[12px] ${paddings[padding]} ${onClick ? 'cursor-pointer hover:border-[#BFDBFE] hover:shadow-sm transition-all duration-150' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  accent?: 'default' | 'success' | 'warning' | 'error';
  onClick?: () => void;
}

export function KPICard({ label, value, sub, icon, accent = 'default', onClick }: KPICardProps) {
  const accents = {
    default: { icon: 'bg-[#EFF6FF] text-[#1E40AF]', value: 'text-[#0F172A]' },
    success: { icon: 'bg-[#DCFCE7] text-[#16A34A]', value: 'text-[#15803D]' },
    warning: { icon: 'bg-[#FEF3C7] text-[#D97706]', value: 'text-[#B45309]' },
    error:   { icon: 'bg-[#FEE2E2] text-[#DC2626]', value: 'text-[#B91C1C]' },
  };
  return (
    <Card onClick={onClick} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#64748B] font-medium">{label}</p>
        {icon && <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0 ${accents[accent].icon}`}>{icon}</div>}
      </div>
      <div>
        <p className={`text-[26px] font-semibold leading-none tracking-tight animate-count-up ${accents[accent].value}`}>{value}</p>
        {sub && <p className="text-sm text-[#64748B] mt-1.5">{sub}</p>}
      </div>
    </Card>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, width = 'md' }: ModalProps) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/25 animate-fade-in" />
      <div
        className={`relative bg-white rounded-[14px] w-full ${widths[width]} shadow-lg animate-slide-up`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 bg-[#F1F5F9] rounded-[8px] p-1" role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-sm font-medium transition-all duration-150 cursor-pointer
            ${active === t.id ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#374151]'}`}
        >
          {t.label}
          {t.count != null && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${active === t.id ? 'bg-[#EFF6FF] text-[#1E40AF]' : 'bg-[#E2E8F0] text-[#94A3B8]'}`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Loading Dots ─────────────────────────────────────────────────────────────
export function LoadingDots() {
  return (
    <span className="flex gap-1 items-center" aria-hidden="true">
      <span className="w-1.5 h-1.5 rounded-full bg-current dot-1" />
      <span className="w-1.5 h-1.5 rounded-full bg-current dot-2" />
      <span className="w-1.5 h-1.5 rounded-full bg-current dot-3" />
    </span>
  );
}

// ── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-[#E2E8F0] ${className}`} />;
}

// ── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-11 h-11 rounded-[10px] bg-[#F1F5F9] flex items-center justify-center text-[#94A3B8]">{icon}</div>
      <div>
        <p className="font-semibold text-[#374151]">{title}</p>
        {description && <p className="text-sm text-[#94A3B8] mt-1 max-w-xs">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  // Use blue-slate tones rather than random vivid colors
  const colors = ['bg-[#1E40AF]', 'bg-[#1D4ED8]', 'bg-[#15803D]', 'bg-[#B45309]', 'bg-[#B91C1C]', 'bg-[#0369A1]'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' };
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[24px] font-semibold text-[#0F172A] leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="text-[#64748B] mt-1 text-sm">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: 'paid' | 'partial' | 'credit' }) {
  const { t } = useTranslation();
  const map = {
    paid:    { label: t('status.paid'),    variant: 'success' as const },
    partial: { label: t('status.partial'), variant: 'warning' as const },
    credit:  { label: t('status.credit'),  variant: 'error'   as const },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

// ── Confirmation Modal ────────────────────────────────────────────────────────
interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
  loading?: boolean;
}

export function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', confirmVariant = 'primary', loading }: ConfirmModalProps) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} width="sm">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-semibold text-[#0F172A]">{title}</h3>
          {description && <p className="text-sm text-[#64748B] mt-1">{description}</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Inline Editable Field ─────────────────────────────────────────────────────
interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}

export function EditableField({ label, value, onChange, type = 'text' }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-0">
      <span className="text-sm text-[#64748B] w-32 flex-shrink-0">{label}</span>
      {editing ? (
        <input
          type={type}
          value={value}
          autoFocus
          onChange={e => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          className="flex-1 text-sm text-right text-[#0F172A] bg-transparent border-b border-[#1E40AF] outline-none py-0.5"
        />
      ) : (
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-sm font-medium text-[#0F172A] text-right">{value}</span>
          <button
            onClick={() => setEditing(true)}
            aria-label={`Edit ${label}`}
            className="text-[#94A3B8] hover:text-[#1E40AF] transition-colors cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8.5 1.5l2 2L4 10H2V8l6.5-6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Language Selector ──────────────────────────────────────────────────────────
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language?.split('-')[0]) || SUPPORTED_LANGUAGES[0];

  function handleSelect(code: LangCode) {
    i18n.changeLanguage(code);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1.5 border border-[#E2E8F0] rounded-[7px] text-sm text-[#374151] bg-white hover:bg-[#F8F9FA] transition-colors cursor-pointer ${compact ? 'px-2.5 py-1.5' : 'px-3 py-1.5'}`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[#64748B] flex-shrink-0">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M8 1.5C8 1.5 6 4 6 8s2 6.5 2 6.5M8 1.5C8 1.5 10 4 10 8s-2 6.5-2 6.5M1.5 8h13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span className="font-medium max-w-[70px] truncate">{current.nativeLabel}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-[#94A3B8]">
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            className="absolute right-0 top-full mt-1.5 z-40 w-52 bg-white border border-[#E2E8F0] rounded-[10px] shadow-md animate-slide-up overflow-hidden"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <button
                key={lang.code}
                role="option"
                aria-selected={lang.code === current.code}
                onClick={() => handleSelect(lang.code as LangCode)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm cursor-pointer transition-colors text-left
                  ${lang.code === current.code
                    ? 'bg-[#EFF6FF] text-[#1E40AF] font-medium'
                    : 'text-[#374151] hover:bg-[#F8F9FA]'
                  }`}
              >
                <span>{lang.nativeLabel}</span>
                {lang.code !== 'en' && <span className="text-xs text-[#94A3B8]">{lang.label}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, useState } from 'react';

// ── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-[10px] transition-all duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-[15px]' };
  const variants = {
    primary: 'bg-[#4338CA] text-white hover:bg-[#3730A3] active:bg-[#312E81]',
    secondary: 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB] active:bg-[#F3F4F6]',
    ghost: 'text-[#374151] hover:bg-[#F3F4F6] active:bg-[#E5E7EB]',
    danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B]',
    success: 'bg-[#16A34A] text-white hover:bg-[#15803D] active:bg-[#166534]',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <LoadingDots />}
      {children}
    </button>
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
    error: 'bg-[#FEE2E2] text-[#B91C1C]',
    info: 'bg-[#EEF2FF] text-[#4338CA]',
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
  ({ label, error, hint, prefix, suffix, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[#374151]">{label}</label>}
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-3 text-[#6B7280] text-sm">{prefix}</span>}
        <input
          ref={ref}
          className={`w-full border border-[#E5E7EB] rounded-[10px] bg-white text-[#111827] text-sm px-3 py-2.5 placeholder-[#9CA3AF] transition-colors
            focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#EEF2FF]
            disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]
            ${error ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#FEE2E2]' : ''}
            ${prefix ? 'pl-8' : ''}
            ${suffix ? 'pr-8' : ''}
            ${className}`}
          {...props}
        />
        {suffix && <span className="absolute right-3 text-[#6B7280] text-sm">{suffix}</span>}
      </div>
      {error && <p className="text-xs text-[#DC2626]">{error}</p>}
      {hint && !error && <p className="text-xs text-[#9CA3AF]">{hint}</p>}
    </div>
  )
);

// ── Select ──────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({ label, error, className = '', children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[#374151]">{label}</label>}
      <select
        className={`w-full border border-[#E5E7EB] rounded-[10px] bg-white text-[#111827] text-sm px-3 py-2.5 appearance-none cursor-pointer
          focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#EEF2FF]
          ${error ? 'border-[#DC2626]' : ''}
          ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-[#DC2626]">{error}</p>}
    </div>
  );
}

// ── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[#374151]">{label}</label>}
      <textarea
        className={`w-full border border-[#E5E7EB] rounded-[10px] bg-white text-[#111827] text-sm px-3 py-2.5 placeholder-[#9CA3AF] resize-none
          focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#EEF2FF]
          ${error ? 'border-[#DC2626]' : ''}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[#DC2626]">{error}</p>}
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
      className={`bg-white border border-[#E5E7EB] rounded-[14px] ${paddings[padding]} ${onClick ? 'cursor-pointer hover:border-[#C7D2FE] hover:shadow-sm transition-all duration-150' : ''} ${className}`}
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
    default: { icon: 'bg-[#EEF2FF] text-[#4338CA]', value: 'text-[#111827]' },
    success: { icon: 'bg-[#DCFCE7] text-[#16A34A]', value: 'text-[#15803D]' },
    warning: { icon: 'bg-[#FEF3C7] text-[#D97706]', value: 'text-[#B45309]' },
    error: { icon: 'bg-[#FEE2E2] text-[#DC2626]', value: 'text-[#B91C1C]' },
  };
  return (
    <Card onClick={onClick} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B7280] font-medium">{label}</p>
        {icon && <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${accents[accent].icon}`}>{icon}</div>}
      </div>
      <div>
        <p className={`text-[28px] font-semibold leading-none tracking-tight ${accents[accent].value}`}>{value}</p>
        {sub && <p className="text-sm text-[#6B7280] mt-1.5">{sub}</p>}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-in" />
      <div
        className={`relative bg-white rounded-[18px] w-full ${widths[width]} shadow-xl animate-slide-up`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-[#E5E7EB]">
            <h2 className="text-base font-semibold text-[#111827]">{title}</h2>
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
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
    <div className="flex gap-1 bg-[#F3F4F6] rounded-[10px] p-1">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium transition-all duration-150 cursor-pointer
            ${active === t.id ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'}`}
        >
          {t.label}
          {t.count != null && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${active === t.id ? 'bg-[#EEF2FF] text-[#4338CA]' : 'bg-[#E5E7EB] text-[#9CA3AF]'}`}>
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
    <span className="flex gap-1 items-center">
      <span className="w-1.5 h-1.5 rounded-full bg-current dot-1" />
      <span className="w-1.5 h-1.5 rounded-full bg-current dot-2" />
      <span className="w-1.5 h-1.5 rounded-full bg-current dot-3" />
    </span>
  );
}

// ── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-[#E5E7EB] ${className}`} />;
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
      <div className="w-12 h-12 rounded-[14px] bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF]">{icon}</div>
      <div>
        <p className="font-semibold text-[#374151]">{title}</p>
        {description && <p className="text-sm text-[#9CA3AF] mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['bg-[#4338CA]', 'bg-[#7C3AED]', 'bg-[#059669]', 'bg-[#D97706]', 'bg-[#DC2626]', 'bg-[#0891B2]'];
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
        <h1 className="text-[28px] font-semibold text-[#111827] leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="text-[#6B7280] mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ── Status chip ───────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: 'paid' | 'partial' | 'credit' }) {
  const map = {
    paid: { label: 'Paid', variant: 'success' as const },
    partial: { label: 'Partial', variant: 'warning' as const },
    credit: { label: 'Credit', variant: 'error' as const },
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
  return (
    <Modal open={open} onClose={onClose} width="sm">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-semibold text-[#111827]">{title}</h3>
          {description && <p className="text-sm text-[#6B7280] mt-1">{description}</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Inline editable field ─────────────────────────────────────────────────────
interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}

export function EditableField({ label, value, onChange, type = 'text' }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F3F4F6] last:border-0">
      <span className="text-sm text-[#6B7280] w-32 flex-shrink-0">{label}</span>
      {editing ? (
        <input
          type={type}
          value={value}
          autoFocus
          onChange={e => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          className="flex-1 text-sm text-right text-[#111827] bg-transparent border-b border-[#4338CA] outline-none py-0.5"
        />
      ) : (
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-sm font-medium text-[#111827] text-right">{value}</span>
          <button onClick={() => setEditing(true)} className="text-[#9CA3AF] hover:text-[#4338CA] transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5l2 2L4 10H2V8l6.5-6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

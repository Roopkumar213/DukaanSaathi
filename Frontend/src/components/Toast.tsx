import { useApp } from '../store';

export default function ToastContainer() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-[100]">
      {toasts.map(t => (
        <div
          key={t.id}
          className="animate-toast-in flex items-center gap-3 px-4 py-3 rounded-[12px] shadow-lg border text-sm font-medium max-w-xs"
          style={{
            background: t.type === 'success' ? '#DCFCE7' : t.type === 'error' ? '#FEE2E2' : '#EEF2FF',
            borderColor: t.type === 'success' ? '#86EFAC' : t.type === 'error' ? '#FCA5A5' : '#C7D2FE',
            color: t.type === 'success' ? '#15803D' : t.type === 'error' ? '#B91C1C' : '#3730A3',
          }}
        >
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="opacity-60 hover:opacity-100 ml-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

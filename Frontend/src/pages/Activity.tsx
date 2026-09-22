import { useState } from 'react';
import { useApp, fmtDate } from '../store';
import { SectionHeader, Tabs, EmptyState } from '../components/ui';

type ActivityFilter = 'all' | 'sale' | 'inventory' | 'payment' | 'khata';

const typeConfig = {
  sale: { label: 'Sale', color: 'bg-[#EFF6FF] text-[#1E40AF]', dot: 'bg-[#1E40AF]' },
  inventory: { label: 'Inventory', color: 'bg-[#DCFCE7] text-[#15803D]', dot: 'bg-[#15803D]' },
  payment: { label: 'Payment', color: 'bg-[#DCFCE7] text-[#15803D]', dot: 'bg-[#15803D]' },
  khata: { label: 'Khata', color: 'bg-[#FEF3C7] text-[#B45309]', dot: 'bg-[#B45309]' },
};

export default function Activity() {
  const { activity } = useApp();
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const filtered = filter === 'all' ? activity : activity.filter(a => a.type === filter);

  return (
    <div className="max-w-[760px] mx-auto p-6 flex flex-col gap-6">
      <SectionHeader title="Activity" />

      <Tabs
        tabs={[
          { id: 'all', label: 'All', count: activity.length },
          { id: 'sale', label: 'Sales', count: activity.filter(a => a.type === 'sale').length },
          { id: 'inventory', label: 'Inventory', count: activity.filter(a => a.type === 'inventory').length },
          { id: 'payment', label: 'Payments', count: activity.filter(a => a.type === 'payment').length },
          { id: 'khata', label: 'Khata', count: activity.filter(a => a.type === 'khata').length },
        ]}
        active={filter}
        onChange={id => setFilter(id as ActivityFilter)}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M10 7v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          title="No activity yet"
          description="Activity will appear here as you use DukaanAI."
        />
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[22px] top-0 bottom-0 w-px bg-[#E2E8F0]" />
          <div className="flex flex-col gap-0">
            {filtered.map((entry, i) => {
              const cfg = typeConfig[entry.type];
              const showDate = i === 0 || fmtDate(entry.date) !== fmtDate(filtered[i - 1].date);
              return (
                <div key={entry.id}>
                  {showDate && (
                    <div className="flex items-center gap-3 mb-3 mt-4 first:mt-0 relative">
                      <div className="w-11 flex-shrink-0" />
                      <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{fmtDate(entry.date)}</span>
                    </div>
                  )}
                  <div className="flex gap-3 items-start mb-2 relative">
                    <div className="w-11 flex-shrink-0 flex items-center justify-center pt-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ring-2 ring-white flex-shrink-0`} />
                    </div>
                    <div className="flex-1 bg-white border border-[#E2E8F0] rounded-[8px] px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-[4px] ${cfg.color}`}>{cfg.label}</span>
                          <p className="text-sm font-semibold text-[#0F172A]">{entry.title}</p>
                        </div>
                        <span className="text-xs text-[#94A3B8] flex-shrink-0">{entry.date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm text-[#475569] mt-1">{entry.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

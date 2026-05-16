import React from 'react';
import { Edit3, X } from '../Icons';

export const SectionHead = ({ icon: Icon, title, subtitle, tone = 'neutral' }) => {
  const toneCls = {
    neutral: 'bg-surface-100 text-surface-600 shadow-[var(--shadow-soft)]',
    brand: 'bg-brand-50 text-brand-600 shadow-[var(--shadow-soft)]',
    warning: 'bg-warning-50 text-warning-600 shadow-[var(--shadow-soft)]',
    accent: 'bg-accent-50 text-accent-600 shadow-[var(--shadow-soft)]',
  }[tone];

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${toneCls}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h4 className="text-sm font-black text-surface-900 tracking-tight sm:text-base">{title}</h4>
        <p className="text-[11px] font-bold leading-snug text-surface-400 sm:text-2xs">{subtitle}</p>
      </div>
    </div>
  );
};

export const ToggleCard = ({ on, onChange, title, desc, tone = 'brand', activeIcon: ActiveIcon }) => {
  const toneMap = {
    warning: { active: 'bg-warning-50/50 border-warning-200 shadow-xl shadow-warning-500/10', track: 'bg-warning-500', textOn: 'text-warning-900', dotIcon: 'text-warning-500' },
    accent: { active: 'bg-accent-50/50 border-accent-300 shadow-xl shadow-accent-500/10', track: 'bg-accent-600', textOn: 'text-accent-900', dotIcon: 'text-accent-600' },
    brand: { active: 'bg-brand-50/50 border-brand-500 shadow-xl shadow-brand-500/10', track: 'bg-brand-500', textOn: 'text-brand-900', dotIcon: 'text-brand-500' },
  };
  const toneCls = toneMap[tone] || toneMap.brand;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={[
        'p-6 rounded-card border-2 transition-all flex items-center justify-between group h-[116px] text-left w-full',
        on ? toneCls.active : 'bg-white border-surface-100 hover:border-surface-200',
      ].join(' ')}
    >
      <div className="space-y-1.5 pr-4">
        <p className={`text-base font-black tracking-tight ${on ? toneCls.textOn : 'text-surface-700'}`}>{title}</p>
        <p className="text-xs font-bold text-surface-400 leading-relaxed opacity-80">{desc}</p>
      </div>
      <div className={`w-14 h-8 rounded-pill relative transition-all duration-500 shrink-0 ${on ? toneCls.track : 'bg-surface-200 shadow-inner'}`}>
        <div className={`absolute top-1 w-6 h-6 bg-white rounded-pill transition-all duration-500 shadow-[var(--shadow-card)] flex items-center justify-center ${on ? 'left-7' : 'left-1'}`}>
          {on && ActiveIcon && <ActiveIcon className={`w-3 h-3 ${toneCls.dotIcon}`} aria-hidden="true" />}
        </div>
      </div>
    </button>
  );
};

export const TopicChip = ({ topic, selected, onToggle, onRemove, onEdit }) => {
  const hasActions = !topic.builtIn;
  const baseRing = selected
    ? 'bg-accent-600 text-white border-transparent shadow-[var(--shadow-card)]'
    : 'bg-white text-surface-700 border-surface-200 hover:border-accent-300 hover:bg-accent-50/40';

  return (
    <div
      className={[
        'group inline-flex items-stretch shrink-0 max-w-full whitespace-nowrap',
        'rounded-pill border text-xs font-black tracking-tight transition-all',
        baseRing,
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onToggle(topic.id)}
        title={topic.description || topic.label}
        aria-pressed={selected}
        className={['inline-flex items-center gap-1.5 py-1.5', hasActions ? 'pl-3.5 pr-2' : 'px-3.5'].join(' ')}
      >
        <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-pill shrink-0 ${selected ? 'bg-white' : 'bg-accent-500'}`} />
        <span className="truncate max-w-[12rem]">{topic.label}</span>
      </button>

      {hasActions && (
        <div className="inline-flex items-center gap-0.5 pr-1.5">
          <button
            type="button"
            onClick={() => onEdit(topic)}
            aria-label={`${topic.label} 편집`}
            className={[
              'w-6 h-6 rounded-pill flex items-center justify-center transition-colors',
              selected ? 'text-white/80 hover:bg-white/20' : 'text-surface-400 hover:bg-surface-100',
            ].join(' ')}
          >
            <Edit3 className="w-3 h-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(topic.id)}
            aria-label={`${topic.label} 삭제`}
            className={[
              'w-6 h-6 rounded-pill flex items-center justify-center transition-colors',
              selected ? 'text-white/80 hover:bg-white/20' : 'text-surface-400 hover:bg-danger-50 hover:text-danger-500',
            ].join(' ')}
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

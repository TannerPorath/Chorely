import React from 'react';
import Tag from './Tag.jsx';

// Single chore row — interactive, uses --u for accent.
// Pass `chore = { id, title, icon, value, frequency, required, done }` and onToggle(id).
export default function ChoreRow({ chore, onToggle, approved = false }) {
  const c = chore;
  const done = c.done;
  return (
    <button
      onClick={() => onToggle?.(c.id)}
      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md transition-all
        ${done
          ? 'bg-[color:var(--u-tint)] border border-[color:color-mix(in_oklab,var(--u)_25%,white)]'
          : 'bg-white border border-ink-200'}
      `}
    >
      <div className="text-2xl shrink-0">{c.icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-sm ${done ? 'text-ink-500 line-through' : 'text-ink-900'}`}>
          {c.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="mono font-bold text-[11px] text-[color:var(--u)]">
            ${c.value.toFixed(2)}
          </span>
          <span className="mono-up text-ink-500">{c.frequency}</span>
          {c.required && <Tag tone="brand">REQ</Tag>}
          {approved && <Tag tone="ok">APPROVED</Tag>}
        </div>
      </div>
      <div
        className={`w-7 h-7 rounded-full grid place-items-center text-white shrink-0 transition-all
          ${done ? '' : 'border-2 border-ink-300'}`}
        style={done ? { background: 'var(--u)' } : undefined}
      >
        {done && (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
        )}
      </div>
    </button>
  );
}

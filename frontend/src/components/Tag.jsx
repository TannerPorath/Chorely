import React from 'react';

// Status / category tag — small uppercase mono chip.
//   <Tag tone="brand">REQUIRED</Tag>
//   <Tag tone="ok">APPROVED</Tag>
const TONES = {
  neutral: 'bg-ink-100 text-ink-700',
  brand:   'text-[color:var(--u)]',  // bg via inline (color-mix from --u)
  ok:      'text-emerald-700',
  warn:    'text-amber-800',
  bad:     'text-rose-700',
};

const TONE_BG = {
  brand: 'color-mix(in oklab, var(--u) 12%, white)',
  ok:    'color-mix(in oklab, #10B981 14%, white)',
  warn:  'color-mix(in oklab, #F59E0B 16%, white)',
  bad:   'color-mix(in oklab, #EF4444 14%, white)',
};

export default function Tag({ tone = 'neutral', className = '', children, style, ...rest }) {
  return (
    <span
      className={`mono-up inline-flex items-center gap-1 px-2 py-1 rounded-full font-bold ${TONES[tone]} ${className}`}
      style={{ ...(TONE_BG[tone] && { background: TONE_BG[tone] }), ...style }}
      {...rest}
    >
      {children}
    </span>
  );
}

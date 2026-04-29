import React from 'react';

// Pill button — uses --u for primary so it adopts the active user's color.
//   <PillButton kind="primary">Approve</PillButton>
//   <PillButton kind="soft">Soft brand</PillButton>
//   <PillButton kind="ghost">Cancel</PillButton>
//   <PillButton kind="glass">Filter</PillButton>
//   <PillButton kind="danger">Reject</PillButton>
const KIND = {
  primary: 'text-white shadow-glow',           // bg via inline style (var(--u))
  soft:    'text-[color:var(--u)]',
  ghost:   'bg-transparent text-ink-700 border border-ink-200 hover:bg-ink-50',
  glass:   'glass text-ink-900',
  danger:  'bg-bad text-white',
};

export default function PillButton({
  kind = 'primary', size = 'md', className = '', children, style, disabled, ...rest
}) {
  const h = size === 'sm' ? 'h-8 text-xs px-3' : size === 'lg' ? 'h-13 text-base px-6' : 'h-10 text-sm px-5';
  const base = 'rounded-2xl font-bold inline-flex items-center justify-center gap-2 transition-transform active:scale-[0.97] disabled:active:scale-100 disabled:cursor-not-allowed';
  const disabledClasses = disabled ? '!bg-ink-100 !text-ink-500 !shadow-none !border-ink-200' : '';
  const inlineStyle = {
    ...(!disabled && kind === 'primary' && { background: 'var(--u)' }),
    ...(!disabled && kind === 'soft' && { background: 'var(--u-tint)' }),
    ...style,
  };
  return (
    <button className={`${base} ${h} ${KIND[kind]} ${disabledClasses} ${className}`} style={inlineStyle} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}

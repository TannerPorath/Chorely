// Liquid-glass surfaces — wraps content in a frosted card.
// Usage:
//   <Glass className="rounded-lg p-4">…</Glass>
//   <GlassDark className="rounded-full px-3 py-1.5">…</GlassDark>
//   <GlassPill>4 pending</GlassPill>
import React from 'react';

export function Glass({ as: Tag = 'div', strong = false, className = '', children, ...rest }) {
  return (
    <Tag className={`glass ${strong ? 'glass-strong' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function GlassDark({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`glass glass-dark ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function GlassPill({ className = '', children, ...rest }) {
  return (
    <GlassDark
      className={`rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 mono text-xs font-bold ${className}`}
      {...rest}
    >
      {children}
    </GlassDark>
  );
}

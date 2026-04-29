import React from 'react';

// Single approval-queue row — used inside the parent's glass-strong panel.
// item = { id, kid: { name, color }, choreTitle, icon, value, time }
export default function ApprovalRow({ item, onApprove, onReject }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-white border border-ink-200"
      style={{ borderLeft: `3px solid ${item.kid.color}` }}
    >
      <div className="text-xl shrink-0">{item.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[13.5px] truncate">{item.choreTitle}</div>
        <div className="mono text-[11px] text-ink-500 mt-0.5">
          {item.kid.name.toUpperCase()} · {item.time} · ${item.value.toFixed(2)}
        </div>
      </div>
      <button
        onClick={() => onApprove?.(item.id)}
        className="w-8 h-8 rounded-full bg-ok text-white grid place-items-center shrink-0 active:scale-95 transition-transform"
        aria-label="Approve"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
      </button>
      <button
        onClick={() => onReject?.(item.id)}
        className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 grid place-items-center shrink-0 active:scale-95 transition-transform"
        aria-label="Reject"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}

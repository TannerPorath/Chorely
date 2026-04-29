import React from 'react';

// Circular progress ring — used in kid hero next to balance.
// Stroke is currentColor so it inherits the surrounding text color (white over ambient stage).
export default function ProgressRing({ progress = 0, label = '', size = 92, stroke = 6 }) {
  const r = (size - stroke * 2) / 2 + stroke / 2; // visual radius
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.32,0.72,0,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center mono font-extrabold text-base">
        {label}
      </div>
    </div>
  );
}

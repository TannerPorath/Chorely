import React from 'react';
import { GlassDark } from './Glass.jsx';

// Kid summary card — used in parent dashboard horizontal scroller.
// kid = { id, name, avatar, color, age, balance, streak, weekProgress (0-1) }
export default function KidCard({ kid, onClick }) {
  return (
    <GlassDark
      onClick={onClick}
      className="shrink-0 min-w-[140px] p-3.5 rounded-lg cursor-pointer"
      style={{ borderTop: `3px solid ${kid.color}` }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-full grid place-items-center text-base"
          style={{ background: kid.color }}
        >
          {kid.avatar}
        </div>
        <div>
          <div className="font-bold text-sm">{kid.name}</div>
          <div className="mono text-[10px] opacity-60">AGE {kid.age}</div>
        </div>
      </div>
      <div className="mono mt-2.5 text-lg font-extrabold tracking-tight">
        ${kid.balance.toFixed(2)}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <div className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${(kid.weekProgress ?? 0.5) * 100}%`,
              background: kid.color,
            }}
          />
        </div>
        <span className="mono text-[10px] opacity-70">{kid.streak}w</span>
      </div>
    </GlassDark>
  );
}

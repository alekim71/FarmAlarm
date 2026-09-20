import React from 'react';

const config = {
  UP:          { label: '정상',   dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  DOWN:        { label: '오류',   dot: 'bg-rose-400',    text: 'text-rose-400',    bg: 'bg-rose-400/10',   pulse: true },
  UNKNOWN:     { label: '미확인', dot: 'bg-amber-400',   text: 'text-amber-400',   bg: 'bg-amber-400/10' },
  ACTIVE:      { label: '활성',   dot: 'bg-rose-400',    text: 'text-rose-400',    bg: 'bg-rose-400/10',   pulse: true },
  ACKNOWLEDGED:{ label: '확인됨', dot: 'bg-amber-400',   text: 'text-amber-400',   bg: 'bg-amber-400/10' },
  RESOLVED:    { label: '해결됨', dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  URL:         { label: 'URL',    dot: 'bg-blue-400',    text: 'text-blue-400',    bg: 'bg-blue-400/10' },
  HEARTBEAT:   { label: 'Heartbeat',   dot: 'bg-purple-400', text: 'text-purple-400', bg: 'bg-purple-400/10' },
  GOOGLE_REMOTE:{ label: '구글원격',  dot: 'bg-sky-400',    text: 'text-sky-400',    bg: 'bg-sky-400/10' }
};

export default function StatusBadge({ status }) {
  const c = config[status] || config.UNKNOWN;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.text} ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot} ${c.pulse ? 'animate-pulse' : ''}`} />
      {c.label}
    </span>
  );
}

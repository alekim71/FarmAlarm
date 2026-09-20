import React, { useEffect, useState } from 'react';
import client from '../api/client';

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('ko-KR');
}

function duration(start, end) {
  if (!start) return '-';
  const ms = (end ? new Date(end) : new Date()) - new Date(start);
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 ${s % 60}초`;
  const h = Math.floor(m / 60);
  return `${h}시간 ${m % 60}분`;
}

const typeLabel = {
  URL_DOWN: 'URL 오류',
  HEARTBEAT_DOWN: '인터넷/전기 단절'
};

const statusColor = {
  ACTIVE:       'border-rose-500 bg-rose-500/5',
  ACKNOWLEDGED: 'border-amber-500 bg-amber-500/5',
  RESOLVED:     'border-emerald-500 bg-emerald-500/5'
};

const dotColor = {
  ACTIVE:       'bg-rose-400 animate-pulse',
  ACKNOWLEDGED: 'bg-amber-400',
  RESOLVED:     'bg-emerald-400'
};

export default function History() {
  const [alarms, setAlarms] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [selectedMonitor, setSelectedMonitor] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get('/alarms?limit=200'),
      client.get('/monitors')
    ]).then(([a, m]) => {
      setAlarms(a.data);
      setMonitors(m.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = selectedMonitor === 'ALL'
    ? alarms
    : alarms.filter(a => String(a.monitorId) === selectedMonitor);

  // Stats
  const total = filtered.length;
  const resolved = filtered.filter(a => a.status === 'RESOLVED').length;
  const active = filtered.filter(a => a.status === 'ACTIVE').length;
  const totalDownMs = filtered
    .filter(a => a.status === 'RESOLVED' && a.resolvedAt)
    .reduce((sum, a) => sum + (new Date(a.resolvedAt) - new Date(a.createdAt)), 0);
  const totalDownMin = Math.floor(totalDownMs / 60000);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">연결 이력</h1>
        <p className="text-sm text-gray-500 mt-0.5">단절 및 복구 이력 타임라인</p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500">모니터 필터:</span>
        <button
          onClick={() => setSelectedMonitor('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedMonitor === 'ALL' ? 'bg-blue-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-gray-200'
          }`}
        >
          전체
        </button>
        {monitors.map(m => (
          <button
            key={m.id}
            onClick={() => setSelectedMonitor(String(m.id))}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedMonitor === String(m.id) ? 'bg-blue-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">전체 이벤트</p>
          <p className="text-2xl font-bold text-white mt-1">{total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">활성 알람</p>
          <p className={`text-2xl font-bold mt-1 ${active > 0 ? 'text-rose-400' : 'text-white'}`}>{active}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">해결된 이벤트</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{resolved}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">총 단절 시간</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{totalDownMin}분</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="card">
        <div className="px-5 py-4 border-b border-surface-700">
          <h2 className="font-semibold text-white">이벤트 타임라인</h2>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-gray-500 text-sm">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-500 text-sm">
            이력이 없습니다. Heartbeat 에이전트가 실행 중인지 확인하세요.
          </div>
        ) : (
          <div className="p-5 space-y-3">
            {filtered.map((alarm) => (
              <div
                key={alarm.id}
                className={`border-l-2 rounded-r-xl px-4 py-3 ${statusColor[alarm.status] || statusColor.RESOLVED}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${dotColor[alarm.status]}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-100">{alarm.message}</p>
                      {alarm.detail && (
                        <p className="text-xs text-gray-500 mt-0.5">{alarm.detail}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                        <span>{alarm.site?.name}</span>
                        <span>·</span>
                        <span>{typeLabel[alarm.type] || alarm.type}</span>
                        {alarm.status === 'RESOLVED' && (
                          <>
                            <span>·</span>
                            <span className="text-amber-400">단절 지속: {duration(alarm.createdAt, alarm.resolvedAt)}</span>
                          </>
                        )}
                        {alarm.status === 'ACTIVE' && (
                          <>
                            <span>·</span>
                            <span className="text-rose-400">현재 단절 중: {duration(alarm.createdAt, null)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500 flex-shrink-0">
                    <p>발생: {formatDate(alarm.createdAt)}</p>
                    {alarm.resolvedAt && <p className="text-emerald-400 mt-1">복구: {formatDate(alarm.resolvedAt)}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

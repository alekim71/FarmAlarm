import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import useStore from '../store/useStore';
import StatusBadge from '../components/StatusBadge';

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${color || 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function Dashboard() {
  const { monitors, alarms, stats, setMonitors, setAlarms, setStats } = useStore();

  useEffect(() => {
    Promise.all([
      client.get('/monitors'),
      client.get('/alarms?limit=10'),
      client.get('/alarms/stats')
    ]).then(([m, a, s]) => {
      setMonitors(m.data);
      setAlarms(a.data);
      setStats(s.data);
    }).catch(console.error);
  }, []);

  const activeAlarms = alarms.filter((a) => a.status === 'ACTIVE');
  const downMonitors = monitors.filter((m) => m.status === 'DOWN');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">대시보드</h1>
        <p className="text-sm text-gray-500 mt-0.5">현장 전체 상태 현황</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 모니터" value={stats.monitors} sub="등록된 모니터 수" />
        <StatCard label="정상 (UP)" value={stats.up} color="text-emerald-400" sub="정상 응답 중" />
        <StatCard label="오류 (DOWN)" value={stats.down} color={stats.down > 0 ? 'text-rose-400' : 'text-white'} sub="응답 없음" />
        <StatCard label="활성 알람" value={stats.active} color={stats.active > 0 ? 'text-rose-400' : 'text-white'} sub="미처리 알람" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Alarms */}
        <div className="card">
          <div className="px-5 py-4 border-b border-surface-700 flex items-center justify-between">
            <h2 className="font-semibold text-white">활성 알람</h2>
            <Link to="/alarms" className="text-xs text-blue-400 hover:text-blue-300">전체 보기</Link>
          </div>
          <div className="divide-y divide-surface-700">
            {activeAlarms.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-500 text-sm">
                <svg className="w-8 h-8 mx-auto mb-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                모든 현장 정상
              </div>
            ) : (
              activeAlarms.slice(0, 5).map((alarm) => (
                <div key={alarm.id} className="px-5 py-3 flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-100 font-medium truncate">{alarm.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {alarm.site?.name} · {timeAgo(alarm.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Monitor Status */}
        <div className="card">
          <div className="px-5 py-4 border-b border-surface-700 flex items-center justify-between">
            <h2 className="font-semibold text-white">모니터 상태</h2>
            <Link to="/monitors" className="text-xs text-blue-400 hover:text-blue-300">전체 보기</Link>
          </div>
          <div className="divide-y divide-surface-700">
            {monitors.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-500 text-sm">
                등록된 모니터가 없습니다
              </div>
            ) : (
              monitors.slice(0, 6).map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-100 font-medium truncate">{m.name}</p>
                    <p className="text-xs text-gray-500 truncate">{m.site?.name} · {m.type}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Down monitors alert */}
      {downMonitors.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-rose-400 font-semibold text-sm">오류 감지: {downMonitors.length}개 모니터</span>
          </div>
          <div className="space-y-1">
            {downMonitors.map((m) => (
              <p key={m.id} className="text-sm text-rose-300">
                · {m.name} ({m.site?.name})
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

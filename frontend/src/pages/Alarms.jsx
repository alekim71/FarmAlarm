import React, { useEffect, useState } from 'react';
import client from '../api/client';
import useStore from '../store/useStore';
import StatusBadge from '../components/StatusBadge';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('ko-KR');
}

const typeLabel = {
  URL_DOWN: 'URL 오류',
  HEARTBEAT_DOWN: '응답 없음'
};

export default function Alarms() {
  const { alarms, setAlarms, updateAlarm, addToast } = useStore();
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    client.get('/alarms?limit=100').then((res) => setAlarms(res.data)).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? alarms : alarms.filter((a) => a.status === filter);

  const handleAck = async (id) => {
    const res = await client.put(`/alarms/${id}/acknowledge`);
    updateAlarm(res.data);
    addToast({ type: 'info', title: '확인 처리됨', message: '알람을 확인 처리했습니다.' });
  };

  const handleResolve = async (id) => {
    const res = await client.put(`/alarms/${id}/resolve`);
    updateAlarm(res.data);
    addToast({ type: 'success', title: '해결 처리됨', message: '알람을 해결 처리했습니다.' });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">알람</h1>
        <p className="text-sm text-gray-500 mt-0.5">모든 알람 이력</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-blue-600 text-white'
                : 'bg-surface-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            {s === 'ALL' ? '전체' : s === 'ACTIVE' ? '활성' : s === 'ACKNOWLEDGED' ? '확인됨' : '해결됨'}
            {s === 'ACTIVE' && (
              <span className="ml-1.5 bg-rose-500 text-white text-xs px-1 rounded-full">
                {alarms.filter((a) => a.status === 'ACTIVE').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-gray-500 text-sm">로딩 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">알람</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">현장</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">유형</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">발생 시각</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">해결 시각</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    {filter === 'ACTIVE' ? '활성 알람이 없습니다. 모든 현장이 정상입니다.' : '알람 이력이 없습니다.'}
                  </td>
                </tr>
              ) : (
                filtered.map((alarm) => (
                  <tr key={alarm.id} className="hover:bg-surface-700/30">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-100">{alarm.message}</p>
                      {alarm.detail && <p className="text-xs text-gray-500 mt-0.5">{alarm.detail}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-400">{alarm.site?.name || '-'}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{typeLabel[alarm.type] || alarm.type}</td>
                    <td className="px-5 py-3"><StatusBadge status={alarm.status} /></td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(alarm.createdAt)}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(alarm.resolvedAt)}</td>
                    <td className="px-5 py-3">
                      {alarm.status === 'ACTIVE' && (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleAck(alarm.id)} className="text-xs text-amber-400 hover:text-amber-300">확인</button>
                          <button onClick={() => handleResolve(alarm.id)} className="text-xs text-emerald-400 hover:text-emerald-300">해결</button>
                        </div>
                      )}
                      {alarm.status === 'ACKNOWLEDGED' && (
                        <button onClick={() => handleResolve(alarm.id)} className="text-xs text-emerald-400 hover:text-emerald-300">해결</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

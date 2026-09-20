import React, { useEffect, useState } from 'react';
import client from '../api/client';
import useStore from '../store/useStore';
import StatusBadge from '../components/StatusBadge';

const emptyForm = {
  siteId: '', name: '', type: 'URL', url: '', agentId: '',
  interval: 60, timeout: 10, expectedStatus: 200, errorPattern: '',
  loginUser: '', loginPass: ''
};

function timeAgo(dateStr) {
  if (!dateStr) return '없음';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  return `${Math.floor(m / 60)}시간 전`;
}

export default function Monitors() {
  const { monitors, sites, setMonitors, setSites, addToast } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [checking, setChecking] = useState(null);

  useEffect(() => {
    Promise.all([client.get('/monitors'), client.get('/sites')]).then(([m, s]) => {
      setMonitors(m.data);
      setSites(s.data);
    });
  }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (m) => {
    setEditing(m.id);
    setForm({
      siteId: m.siteId, name: m.name, type: m.type,
      url: m.url || '', agentId: m.agentId || '',
      interval: m.interval, timeout: m.timeout,
      expectedStatus: m.expectedStatus, errorPattern: m.errorPattern || '',
      loginUser: m.loginUser || '', loginPass: m.loginPass || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const res = await client.put(`/monitors/${editing}`, form);
        setMonitors(monitors.map((m) => (m.id === editing ? res.data : m)));
        addToast({ type: 'success', title: '수정 완료', message: `${form.name} 모니터가 수정되었습니다.` });
      } else {
        const res = await client.post('/monitors', form);
        setMonitors([...monitors, res.data]);
        addToast({ type: 'success', title: '추가 완료', message: `${form.name} 모니터가 추가되었습니다.` });
      }
      setShowModal(false);
    } catch (err) {
      addToast({ type: 'error', title: '오류', message: err.response?.data?.error || '저장 실패' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`'${name}' 모니터를 삭제하시겠습니까?`)) return;
    await client.delete(`/monitors/${id}`);
    setMonitors(monitors.filter((m) => m.id !== id));
    addToast({ type: 'info', title: '삭제 완료', message: `${name} 모니터가 삭제되었습니다.` });
  };

  const handleCheck = async (id) => {
    setChecking(id);
    try {
      const res = await client.post(`/monitors/${id}/check`);
      setMonitors(monitors.map((m) => (m.id === id ? { ...m, ...res.data } : m)));
      addToast({ type: 'info', title: '확인 완료', message: `상태: ${res.data.status}` });
    } catch (err) {
      addToast({ type: 'error', title: '오류', message: err.response?.data?.error || '확인 실패' });
    } finally {
      setChecking(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">모니터</h1>
          <p className="text-sm text-gray-500 mt-0.5">URL 및 Heartbeat 모니터 관리</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          모니터 추가
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">이름</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">현장</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">유형</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">대상</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">마지막 확인</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {monitors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                  등록된 모니터가 없습니다. 모니터를 추가해 주세요.
                </td>
              </tr>
            ) : (
              monitors.map((m) => (
                <tr key={m.id} className="hover:bg-surface-700/30">
                  <td className="px-5 py-3 font-medium text-gray-100">{m.name}</td>
                  <td className="px-5 py-3 text-gray-400">{m.site?.name || '-'}</td>
                  <td className="px-5 py-3"><StatusBadge status={m.type} /></td>
                  <td className="px-5 py-3 text-gray-400 max-w-xs truncate">
                    {m.type === 'URL' ? m.url : `Agent: ${m.agentId}`}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-5 py-3 text-gray-400">{timeAgo(m.lastChecked)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {m.type === 'URL' && (
                        <button
                          onClick={() => handleCheck(m.id)}
                          disabled={checking === m.id}
                          className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                        >
                          {checking === m.id ? '확인 중...' : '지금 확인'}
                        </button>
                      )}
                      <button onClick={() => openEdit(m)} className="text-gray-500 hover:text-gray-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(m.id, m.name)} className="text-gray-500 hover:text-rose-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-white mb-5">
              {editing ? '모니터 수정' : '모니터 추가'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">현장</label>
                  <select
                    className="input"
                    value={form.siteId}
                    onChange={(e) => setForm({ ...form, siteId: e.target.value })}
                    required
                  >
                    <option value="">현장 선택</option>
                    {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">유형</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="URL">URL 모니터</option>
                    <option value="HEARTBEAT">Heartbeat</option>
                    <option value="GOOGLE_REMOTE">구글 원격 데스크톱</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">모니터 이름</label>
                <input
                  type="text"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="예: 네답 장비, 목장 에이전트"
                  required
                />
              </div>
              {form.type === 'URL' ? (
                <>
                  <div>
                    <label className="label">모니터링 URL</label>
                    <input
                      type="url"
                      className="input"
                      value={form.url}
                      onChange={(e) => setForm({ ...form, url: e.target.value })}
                      placeholder="https://example.com"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label">확인 주기(초)</label>
                      <input type="number" className="input" value={form.interval} onChange={(e) => setForm({ ...form, interval: +e.target.value })} min={10} />
                    </div>
                    <div>
                      <label className="label">타임아웃(초)</label>
                      <input type="number" className="input" value={form.timeout} onChange={(e) => setForm({ ...form, timeout: +e.target.value })} min={1} />
                    </div>
                    <div>
                      <label className="label">기대 상태코드</label>
                      <input type="number" className="input" value={form.expectedStatus} onChange={(e) => setForm({ ...form, expectedStatus: +e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="label">오류 패턴 (선택) — 응답에 이 문자열이 있으면 오류로 처리</label>
                    <input
                      type="text"
                      className="input"
                      value={form.errorPattern}
                      onChange={(e) => setForm({ ...form, errorPattern: e.target.value })}
                      placeholder="예: device appears to be offline"
                    />
                  </div>
                </>
              ) : form.type === 'GOOGLE_REMOTE' ? (
                <>
                  <div>
                    <label className="label">구글 계정 이메일</label>
                    <input
                      type="email"
                      className="input"
                      value={form.loginUser}
                      onChange={(e) => setForm({ ...form, loginUser: e.target.value })}
                      placeholder="example@gmail.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">구글 계정 비밀번호</label>
                    <input
                      type="password"
                      className="input"
                      value={form.loginPass}
                      onChange={(e) => setForm({ ...form, loginPass: e.target.value })}
                      placeholder="비밀번호"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">확인 주기(초)</label>
                    <input type="number" className="input" value={form.interval} onChange={(e) => setForm({ ...form, interval: +e.target.value })} min={60} />
                    <p className="text-xs text-gray-500 mt-1">구글 원격 데스크톱 확인은 최소 60초 이상 권장합니다.</p>
                  </div>
                </>
              ) : (
                <div>
                  <label className="label">에이전트 ID</label>
                  <input
                    type="text"
                    className="input"
                    value={form.agentId}
                    onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                    placeholder="예: farm-agent-001"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    현장 에이전트에서 POST /api/heartbeat/{'{agentId}'} 를 호출하도록 설정하세요.
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">{editing ? '저장' : '추가'}</button>
                <button type="button" className="btn-ghost flex-1" onClick={() => setShowModal(false)}>취소</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

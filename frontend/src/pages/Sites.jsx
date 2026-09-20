import React, { useEffect, useState } from 'react';
import client from '../api/client';
import useStore from '../store/useStore';

const emptyForm = { name: '', location: '', latitude: '', longitude: '' };

export default function Sites() {
  const { sites, setSites, addToast } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    client.get('/sites').then((res) => setSites(res.data));
  }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (s) => {
    setEditing(s.id);
    setForm({ name: s.name, location: s.location || '', latitude: s.latitude || '', longitude: s.longitude || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null
    };
    try {
      if (editing) {
        const res = await client.put(`/sites/${editing}`, data);
        setSites(sites.map((s) => (s.id === editing ? res.data : s)));
        addToast({ type: 'success', title: '수정 완료', message: `${form.name} 현장이 수정되었습니다.` });
      } else {
        const res = await client.post('/sites', data);
        setSites([...sites, res.data]);
        addToast({ type: 'success', title: '추가 완료', message: `${form.name} 현장이 추가되었습니다.` });
      }
      setShowModal(false);
    } catch (err) {
      addToast({ type: 'error', title: '오류', message: err.response?.data?.error || '저장 실패' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`'${name}' 현장을 삭제하시겠습니까? 해당 현장의 모든 모니터와 알람도 삭제됩니다.`)) return;
    await client.delete(`/sites/${id}`);
    setSites(sites.filter((s) => s.id !== id));
    addToast({ type: 'info', title: '삭제 완료', message: `${name} 현장이 삭제되었습니다.` });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">현장</h1>
          <p className="text-sm text-gray-500 mt-0.5">목장, 공장, 사무실 등 모니터링 현장 관리</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          현장 추가
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sites.length === 0 ? (
          <div className="col-span-3 card p-10 text-center text-gray-500">
            등록된 현장이 없습니다. 현장을 추가해 주세요.
          </div>
        ) : (
          sites.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(s)} className="text-gray-500 hover:text-gray-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(s.id, s.name)} className="text-gray-500 hover:text-rose-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-100">{s.name}</h3>
              {s.location && <p className="text-sm text-gray-500 mt-1">{s.location}</p>}
              <div className="flex gap-4 mt-3 pt-3 border-t border-surface-700">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{s._count?.monitors || 0}</p>
                  <p className="text-xs text-gray-500">모니터</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{s._count?.alarms || 0}</p>
                  <p className="text-xs text-gray-500">알람</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-white mb-5">
              {editing ? '현장 수정' : '현장 추가'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">현장 이름</label>
                <input type="text" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 시흥 목장, 본사 사무실" required />
              </div>
              <div>
                <label className="label">위치 (주소 또는 설명)</label>
                <input type="text" className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="예: 경기도 시흥시 00동" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">위도 (선택)</label>
                  <input type="number" step="any" className="input" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="37.4563" />
                </div>
                <div>
                  <label className="label">경도 (선택)</label>
                  <input type="number" step="any" className="input" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="126.7052" />
                </div>
              </div>
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

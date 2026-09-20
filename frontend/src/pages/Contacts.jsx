import React, { useEffect, useState } from 'react';
import client from '../api/client';
import useStore from '../store/useStore';

const emptyForm = { siteId: '', name: '', phone: '', email: '', role: '', priority: 1 };

const roleOptions = [
  '목장주', '관리인', '야간 당직자', '전기공사업체', 'ISP 고객센터',
  '설비업체', '가스업체', '소방서', '경찰서', '한전', '읍사무소', '기타'
];

export default function Contacts() {
  const { sites, setSites, addToast } = useStore();
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    Promise.all([client.get('/contacts'), client.get('/sites')]).then(([c, s]) => {
      setContacts(c.data);
      setSites(s.data);
    });
  }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (c) => {
    setEditing(c.id);
    setForm({ siteId: c.siteId || '', name: c.name, phone: c.phone || '', email: c.email || '', role: c.role, priority: c.priority });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const res = await client.put(`/contacts/${editing}`, form);
        setContacts(contacts.map((c) => (c.id === editing ? res.data : c)));
        addToast({ type: 'success', title: '수정 완료', message: `${form.name} 연락처가 수정되었습니다.` });
      } else {
        const res = await client.post('/contacts', form);
        setContacts([...contacts, res.data]);
        addToast({ type: 'success', title: '추가 완료', message: `${form.name} 연락처가 추가되었습니다.` });
      }
      setShowModal(false);
    } catch (err) {
      addToast({ type: 'error', title: '오류', message: err.response?.data?.error || '저장 실패' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`'${name}' 연락처를 삭제하시겠습니까?`)) return;
    await client.delete(`/contacts/${id}`);
    setContacts(contacts.filter((c) => c.id !== id));
  };

  const priorityBadge = (p) => (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p === 1 ? 'bg-blue-400/10 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
      {p === 1 ? '1차' : '2차'}
    </span>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">연락처</h1>
          <p className="text-sm text-gray-500 mt-0.5">알람 수신자 및 긴급 연락처 관리</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          연락처 추가
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">이름</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">역할</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">전화번호</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">이메일</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">현장</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">우선순위</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                  등록된 연락처가 없습니다.
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="hover:bg-surface-700/30">
                  <td className="px-5 py-3 font-medium text-gray-100">{c.name}</td>
                  <td className="px-5 py-3 text-gray-400">{c.role}</td>
                  <td className="px-5 py-3">
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} className="text-blue-400 hover:text-blue-300">{c.phone}</a>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-400">{c.email || '-'}</td>
                  <td className="px-5 py-3 text-gray-400">{c.site?.name || '전체'}</td>
                  <td className="px-5 py-3">{priorityBadge(c.priority)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(c)} className="text-gray-500 hover:text-gray-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(c.id, c.name)} className="text-gray-500 hover:text-rose-400">
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

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-white mb-5">
              {editing ? '연락처 수정' : '연락처 추가'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">이름</label>
                  <input type="text" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">역할</label>
                  <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required>
                    <option value="">선택</option>
                    {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">전화번호</label>
                <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" />
              </div>
              <div>
                <label className="label">이메일</label>
                <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">현장 (선택)</label>
                  <select className="input" value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })}>
                    <option value="">전체 현장</option>
                    {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">우선순위</label>
                  <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: +e.target.value })}>
                    <option value={1}>1차 (주담당)</option>
                    <option value={2}>2차 (에스컬레이션)</option>
                  </select>
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

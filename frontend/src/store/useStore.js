import { create } from 'zustand';

const useStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  sites: [],
  monitors: [],
  alarms: [],
  stats: { total: 0, active: 0, monitors: 0, up: 0, down: 0 },
  toasts: [],

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  setSites: (sites) => set({ sites }),
  setMonitors: (monitors) => set({ monitors }),
  setAlarms: (alarms) => set({ alarms }),
  setStats: (stats) => set({ stats }),

  addAlarm: (alarm) => {
    set((state) => ({
      alarms: [alarm, ...state.alarms],
      stats: { ...state.stats, active: state.stats.active + 1 }
    }));
    get().addToast({ type: 'error', title: '알람 발생', message: alarm.message });
  },

  updateAlarm: (updated) => {
    set((state) => ({
      alarms: state.alarms.map((a) => (a.id === updated.id ? updated : a)),
      stats: {
        ...state.stats,
        active: state.alarms.filter(
          (a) => a.id !== updated.id && a.status === 'ACTIVE'
        ).length + (updated.status === 'ACTIVE' ? 1 : 0)
      }
    }));
  },

  resolveMonitorAlarms: ({ monitorId, monitorName }) => {
    set((state) => ({
      alarms: state.alarms.map((a) =>
        a.monitorId === monitorId && a.status !== 'RESOLVED'
          ? { ...a, status: 'RESOLVED' }
          : a
      )
    }));
    get().addToast({ type: 'success', title: '복구됨', message: `${monitorName} 정상화` });
  },

  updateMonitorStatus: ({ id, status }) => {
    set((state) => ({
      monitors: state.monitors.map((m) => (m.id === id ? { ...m, status } : m))
    }));
  },

  addToast: (toast) => {
    const id = Date.now();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  }
}));

export default useStore;

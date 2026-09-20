import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import useStore from './store/useStore';
import client from './api/client';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Monitors from './pages/Monitors';
import Alarms from './pages/Alarms';
import Contacts from './pages/Contacts';
import Sites from './pages/Sites';
import Toast from './components/Toast';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function PrivateRoute({ children }) {
  const token = useStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { token, setUser, addAlarm, updateAlarm, resolveMonitorAlarms, updateMonitorStatus } = useStore();

  useEffect(() => {
    if (!token) return;

    client.get('/auth/me').then((res) => setUser(res.data)).catch(() => {});

    const socket = io(BASE_URL, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socket.on('alarm:new', addAlarm);
    socket.on('alarm:updated', updateAlarm);
    socket.on('alarm:resolved', resolveMonitorAlarms);
    socket.on('monitor:status_change', updateMonitorStatus);

    return () => socket.disconnect();
  }, [token]);

  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="monitors" element={<Monitors />} />
          <Route path="alarms" element={<Alarms />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="sites" element={<Sites />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const sitesRoutes = require('./routes/sites');
const monitorsRoutes = require('./routes/monitors');
const alarmsRoutes = require('./routes/alarms');
const contactsRoutes = require('./routes/contacts');
const heartbeatRoutes = require('./routes/heartbeat');
const { startPoller } = require('./services/poller');

const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:4173'];

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] }
});

const prisma = new PrismaClient();

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.set('io', io);
app.set('prisma', prisma);

app.use('/api/auth', authRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/monitors', monitorsRoutes);
app.use('/api/alarms', alarmsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/heartbeat', heartbeatRoutes);
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));

io.on('connection', (socket) => {
  console.log('클라이언트 연결:', socket.id);
  socket.on('disconnect', () => console.log('클라이언트 연결 종료:', socket.id));
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, async () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
  await prisma.$connect();
  console.log('데이터베이스 연결 완료');
  startPoller(prisma, io);
});

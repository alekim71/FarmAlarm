const cron = require('node-cron');
const axios = require('axios');

let prisma, io;

async function checkUrlMonitor(monitor, prismaClient, socketIo) {
  const _prisma = prismaClient || prisma;
  const _io = socketIo || io;
  const previousStatus = monitor.status;
  let newStatus = 'UP';
  let detail = null;

  try {
    const response = await axios.get(monitor.url, {
      timeout: (monitor.timeout || 10) * 1000,
      validateStatus: () => true,
      headers: { 'User-Agent': 'OmniAlarm-Monitor/1.0' }
    });

    const statusOk = response.status === (monitor.expectedStatus || 200);
    const bodyStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    const patternOk = !monitor.errorPattern || !bodyStr.includes(monitor.errorPattern);

    if (!statusOk || !patternOk) {
      newStatus = 'DOWN';
      detail = `HTTP ${response.status}`;
      if (!patternOk) detail += ' · 오류 패턴 감지';
    }
  } catch (error) {
    newStatus = 'DOWN';
    detail = error.code === 'ECONNABORTED' ? '응답 타임아웃' : error.message;
  }

  await _prisma.monitor.update({
    where: { id: monitor.id },
    data: { status: newStatus, lastChecked: new Date() }
  });

  if (previousStatus !== newStatus) {
    _io.emit('monitor:status_change', { id: monitor.id, status: newStatus });

    if (newStatus === 'DOWN') {
      const alarm = await _prisma.alarm.create({
        data: {
          siteId: monitor.siteId,
          monitorId: monitor.id,
          type: 'URL_DOWN',
          status: 'ACTIVE',
          message: `[${monitor.name}] 접속 오류`,
          detail
        },
        include: {
          site: { select: { id: true, name: true } },
          monitor: { select: { id: true, name: true, type: true } }
        }
      });
      _io.emit('alarm:new', alarm);
    } else if (newStatus === 'UP') {
      await _prisma.alarm.updateMany({
        where: { monitorId: monitor.id, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
        data: { status: 'RESOLVED', resolvedAt: new Date() }
      });
      _io.emit('alarm:resolved', { monitorId: monitor.id, monitorName: monitor.name });
    }
  }
}

async function checkHeartbeatMonitors() {
  const THRESHOLD_MS = 3 * 60 * 1000;
  const monitors = await prisma.monitor.findMany({ where: { type: 'HEARTBEAT' } });

  for (const monitor of monitors) {
    const previousStatus = monitor.status;
    const isStale = !monitor.lastSeenAt ||
      (Date.now() - new Date(monitor.lastSeenAt).getTime()) > THRESHOLD_MS;

    const newStatus = isStale ? (monitor.lastSeenAt ? 'DOWN' : 'UNKNOWN') : 'UP';

    if (previousStatus !== newStatus) {
      await prisma.monitor.update({
        where: { id: monitor.id },
        data: { status: newStatus, lastChecked: new Date() }
      });
      io.emit('monitor:status_change', { id: monitor.id, status: newStatus });

      if (newStatus === 'DOWN') {
        const lastSeen = monitor.lastSeenAt
          ? new Date(monitor.lastSeenAt).toLocaleString('ko-KR')
          : '기록 없음';
        const alarm = await prisma.alarm.create({
          data: {
            siteId: monitor.siteId,
            monitorId: monitor.id,
            type: 'HEARTBEAT_DOWN',
            status: 'ACTIVE',
            message: `[${monitor.name}] 응답 없음 (인터넷/전기 확인 필요)`,
            detail: `마지막 신호: ${lastSeen}`
          },
          include: {
            site: { select: { id: true, name: true } },
            monitor: { select: { id: true, name: true, type: true } }
          }
        });
        io.emit('alarm:new', alarm);
      } else if (newStatus === 'UP' && previousStatus === 'DOWN') {
        await prisma.alarm.updateMany({
          where: { monitorId: monitor.id, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
          data: { status: 'RESOLVED', resolvedAt: new Date() }
        });
        io.emit('alarm:resolved', { monitorId: monitor.id, monitorName: monitor.name });
      }
    }
  }
}

async function runChecks() {
  try {
    const now = new Date();
    const urlMonitors = await prisma.monitor.findMany({ where: { type: 'URL' } });
    const toCheck = urlMonitors.filter(m => {
      if (!m.lastChecked) return true;
      return (now - new Date(m.lastChecked)) / 1000 >= m.interval;
    });

    await Promise.allSettled(toCheck.map(m => checkUrlMonitor(m, prisma, io)));
    await checkHeartbeatMonitors();
  } catch (err) {
    console.error('폴러 오류:', err);
  }
}

function startPoller(prismaClient, socketIo) {
  prisma = prismaClient;
  io = socketIo;
  cron.schedule('* * * * *', runChecks);
  console.log('폴러 시작 (1분 간격)');
}

module.exports = { startPoller, checkUrlMonitor };

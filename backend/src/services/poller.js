const cron = require('node-cron');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getGoogleRemoteStatus } = require('./googleRemoteScraper');

let prisma, io;

async function checkUrlWithLogin(monitor) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    await page.goto(monitor.url, { waitUntil: 'networkidle2', timeout: (monitor.timeout || 30) * 1000 });

    // 아이디 입력란 찾기 (일반적인 선택자 순서대로 시도)
    const userSelectors = ['input[name="user_id"]', 'input[name="userid"]', 'input[name="username"]', 'input[name="id"]', 'input[name="loginId"]', 'input[type="text"]'];
    const passSelectors = ['input[name="user_pw"]', 'input[name="password"]', 'input[name="passwd"]', 'input[name="loginPw"]', 'input[type="password"]'];

    let userField = null;
    for (const sel of userSelectors) {
      userField = await page.$(sel);
      if (userField) break;
    }
    let passField = null;
    for (const sel of passSelectors) {
      passField = await page.$(sel);
      if (passField) break;
    }

    if (!userField || !passField) {
      return { status: 'DOWN', detail: '로그인 폼을 찾을 수 없음' };
    }

    await userField.type(monitor.loginUser, { delay: 30 });
    await passField.type(monitor.loginPass, { delay: 30 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
      passField.press('Enter')
    ]);

    const currentUrl = page.url();
    const content = await page.content();
    // 여전히 로그인 페이지이거나 오류 메시지가 있으면 DOWN
    const loginFailed = content.includes('비밀번호가 틀') || content.includes('아이디가 틀') ||
      content.includes('로그인 실패') || content.includes('login failed') ||
      content.includes('incorrect') || currentUrl === monitor.url;

    if (loginFailed) {
      return { status: 'DOWN', detail: '로그인 실패 또는 접속 불가' };
    }
    return { status: 'UP', detail: null };
  } catch (error) {
    return { status: 'DOWN', detail: error.message };
  } finally {
    await browser.close();
  }
}

async function checkUrlMonitor(monitor, prismaClient, socketIo) {
  const _prisma = prismaClient || prisma;
  const _io = socketIo || io;
  const previousStatus = monitor.status;
  let newStatus = 'UP';
  let detail = null;

  try {
    if (monitor.loginUser && monitor.loginPass) {
      // 로그인이 필요한 URL — Puppeteer 사용
      const result = await checkUrlWithLogin(monitor);
      newStatus = result.status;
      detail = result.detail;
    } else {
      // 로그인 불필요 — 기존 axios 방식
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

async function checkGoogleRemoteMonitor(monitor) {
  if (!monitor.loginUser || !monitor.loginPass) return;

  const result = await getGoogleRemoteStatus(monitor.loginUser, monitor.loginPass);

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      lastChecked: new Date(),
      status: result.success ? (result.devices.some(d => !d.online) ? 'DOWN' : 'UP') : 'UNKNOWN',
      devices: result.success ? JSON.stringify(result.devices) : null
    }
  });

  if (!result.success) {
    console.error(`구글 원격 스크래핑 실패 [${monitor.name}]:`, result.error);
    return;
  }

  for (const device of result.devices) {
    const existingAlarm = await prisma.alarm.findFirst({
      where: {
        monitorId: monitor.id,
        status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
        message: { contains: device.name }
      }
    });

    if (!device.online && !existingAlarm) {
      const alarm = await prisma.alarm.create({
        data: {
          siteId: monitor.siteId,
          monitorId: monitor.id,
          type: 'GOOGLE_REMOTE_OFFLINE',
          status: 'ACTIVE',
          message: `[구글원격] ${device.name} 오프라인`,
          detail: device.lastSeen || '마지막 접속 시간 불명'
        },
        include: {
          site: { select: { id: true, name: true } },
          monitor: { select: { id: true, name: true, type: true } }
        }
      });
      io.emit('alarm:new', alarm);
    } else if (device.online && existingAlarm) {
      await prisma.alarm.updateMany({
        where: { monitorId: monitor.id, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }, message: { contains: device.name } },
        data: { status: 'RESOLVED', resolvedAt: new Date() }
      });
      io.emit('alarm:resolved', { monitorId: monitor.id, monitorName: device.name });
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

    const googleMonitors = await prisma.monitor.findMany({ where: { type: 'GOOGLE_REMOTE' } });
    const toCheckGoogle = googleMonitors.filter(m => {
      if (!m.lastChecked) return true;
      return (now - new Date(m.lastChecked)) / 1000 >= (m.interval || 300);
    });
    await Promise.allSettled(toCheckGoogle.map(m => checkGoogleRemoteMonitor(m)));
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

module.exports = { startPoller, checkUrlMonitor, checkGoogleRemoteMonitor };

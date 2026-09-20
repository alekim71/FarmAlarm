const express = require('express');
const auth = require('../middleware/auth');
const { checkUrlMonitor, checkGoogleRemoteMonitor } = require('../services/poller');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const monitors = await prisma.monitor.findMany({
    include: { site: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' }
  });
  res.json(monitors);
});

router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { siteId, name, type, url, agentId, interval, timeout, expectedStatus, errorPattern, loginUser, loginPass } = req.body;
  const monitor = await prisma.monitor.create({
    data: {
      siteId: parseInt(siteId),
      name,
      type,
      url: url || null,
      agentId: agentId || null,
      interval: interval || 60,
      timeout: timeout || 10,
      expectedStatus: expectedStatus || 200,
      errorPattern: errorPattern || null,
      loginUser: loginUser || null,
      loginPass: loginPass || null
    },
    include: { site: { select: { id: true, name: true } } }
  });
  res.status(201).json(monitor);
});

router.put('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { name, url, agentId, interval, timeout, expectedStatus, errorPattern, loginUser, loginPass } = req.body;
  const monitor = await prisma.monitor.update({
    where: { id: parseInt(req.params.id) },
    data: {
      name,
      url: url || null,
      agentId: agentId || null,
      interval, timeout, expectedStatus,
      errorPattern: errorPattern || null,
      loginUser: loginUser || null,
      loginPass: loginPass || null
    },
    include: { site: { select: { id: true, name: true } } }
  });
  res.json(monitor);
});

router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  await prisma.monitor.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ ok: true });
});

router.post('/:id/check', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const monitor = await prisma.monitor.findUnique({
    where: { id: parseInt(req.params.id) }
  });
  if (!monitor) return res.status(404).json({ error: '모니터를 찾을 수 없습니다.' });
  if (monitor.type !== 'URL' && monitor.type !== 'GOOGLE_REMOTE') {
    return res.status(400).json({ error: 'URL 또는 구글 원격 모니터만 수동 확인이 가능합니다.' });
  }

  if (monitor.type === 'URL') {
    await checkUrlMonitor(monitor, prisma, io);
  } else {
    await checkGoogleRemoteMonitor(monitor);
  }
  const updated = await prisma.monitor.findUnique({ where: { id: monitor.id } });
  res.json(updated);
});

module.exports = router;

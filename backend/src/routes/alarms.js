const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { status, siteId, limit = 50 } = req.query;

  const where = {};
  if (status) where.status = status;
  if (siteId) where.siteId = parseInt(siteId);

  const alarms = await prisma.alarm.findMany({
    where,
    include: {
      site: { select: { id: true, name: true } },
      monitor: { select: { id: true, name: true, type: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit)
  });
  res.json(alarms);
});

router.get('/stats', async (req, res) => {
  const prisma = req.app.get('prisma');
  const [total, active, monitors, up, down] = await Promise.all([
    prisma.alarm.count(),
    prisma.alarm.count({ where: { status: 'ACTIVE' } }),
    prisma.monitor.count(),
    prisma.monitor.count({ where: { status: 'UP' } }),
    prisma.monitor.count({ where: { status: 'DOWN' } })
  ]);
  res.json({ total, active, monitors, up, down });
});

router.put('/:id/acknowledge', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const alarm = await prisma.alarm.update({
    where: { id: parseInt(req.params.id) },
    data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
    include: {
      site: { select: { id: true, name: true } },
      monitor: { select: { id: true, name: true, type: true } }
    }
  });
  io.emit('alarm:updated', alarm);
  res.json(alarm);
});

router.put('/:id/resolve', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const alarm = await prisma.alarm.update({
    where: { id: parseInt(req.params.id) },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
    include: {
      site: { select: { id: true, name: true } },
      monitor: { select: { id: true, name: true, type: true } }
    }
  });
  io.emit('alarm:updated', alarm);
  res.json(alarm);
});

module.exports = router;

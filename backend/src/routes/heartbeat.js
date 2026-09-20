const express = require('express');

const router = express.Router();

// POST /api/heartbeat/:agentId
// 현장 에이전트가 주기적으로 호출하는 엔드포인트 (인증 불필요)
router.post('/:agentId', async (req, res) => {
  const { agentId } = req.params;
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');

  const monitor = await prisma.monitor.findFirst({
    where: { type: 'HEARTBEAT', agentId }
  });

  if (!monitor) {
    return res.status(404).json({ error: `에이전트 '${agentId}'가 등록되지 않았습니다.` });
  }

  const wasDown = monitor.status === 'DOWN';

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: { lastSeenAt: new Date(), status: 'UP', lastChecked: new Date() }
  });

  if (wasDown) {
    await prisma.alarm.updateMany({
      where: { monitorId: monitor.id, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
      data: { status: 'RESOLVED', resolvedAt: new Date() }
    });
    io.emit('alarm:resolved', { monitorId: monitor.id, monitorName: monitor.name });
    io.emit('monitor:status_change', { id: monitor.id, status: 'UP' });
  }

  res.json({ ok: true, timestamp: new Date(), monitorName: monitor.name });
});

module.exports = router;

const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const sites = await prisma.site.findMany({
    include: {
      _count: { select: { monitors: true, alarms: true } }
    },
    orderBy: { createdAt: 'asc' }
  });
  res.json(sites);
});

router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { name, location, latitude, longitude } = req.body;
  const site = await prisma.site.create({
    data: { name, location, latitude, longitude }
  });
  res.status(201).json(site);
});

router.put('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { name, location, latitude, longitude } = req.body;
  const site = await prisma.site.update({
    where: { id: parseInt(req.params.id) },
    data: { name, location, latitude, longitude }
  });
  res.json(site);
});

router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  await prisma.site.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ ok: true });
});

module.exports = router;

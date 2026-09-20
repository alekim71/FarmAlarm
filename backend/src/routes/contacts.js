const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const contacts = await prisma.contact.findMany({
    include: { site: { select: { id: true, name: true } } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }]
  });
  res.json(contacts);
});

router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { siteId, name, phone, email, role, priority } = req.body;
  const contact = await prisma.contact.create({
    data: {
      siteId: siteId ? parseInt(siteId) : null,
      name,
      phone: phone || null,
      email: email || null,
      role,
      priority: priority || 1
    },
    include: { site: { select: { id: true, name: true } } }
  });
  res.status(201).json(contact);
});

router.put('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { siteId, name, phone, email, role, priority } = req.body;
  const contact = await prisma.contact.update({
    where: { id: parseInt(req.params.id) },
    data: {
      siteId: siteId ? parseInt(siteId) : null,
      name,
      phone: phone || null,
      email: email || null,
      role,
      priority: priority || 1
    },
    include: { site: { select: { id: true, name: true } } }
  });
  res.json(contact);
});

router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  await prisma.contact.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ ok: true });
});

module.exports = router;

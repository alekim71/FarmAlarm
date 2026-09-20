const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

const router = express.Router();
const SECRET = () => process.env.JWT_SECRET || 'change-this-secret';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const prisma = req.app.get('prisma');

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const token = jwt.sign({ userId: user.id }, SECRET(), { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  const prisma = req.app.get('prisma');
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true }
  });
  res.json(user);
});

module.exports = router;

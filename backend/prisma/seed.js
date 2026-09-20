const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin1234', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@farmalarm.com' },
    update: {},
    create: { email: 'admin@farmalarm.com', password, name: '관리자' }
  });
  console.log('관리자 계정 생성:', user.email);

  const site = await prisma.site.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: '테스트 목장', location: '경기도 시흥시' }
  });
  console.log('샘플 현장 생성:', site.name);

  await prisma.monitor.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      siteId: site.id,
      name: '구글 접속 확인',
      type: 'URL',
      url: 'https://www.google.com',
      interval: 60,
      timeout: 10,
      expectedStatus: 200
    }
  });

  await prisma.monitor.upsert({
    where: { agentId: 'farm-agent-001' },
    update: {},
    create: {
      siteId: site.id,
      name: '목장 현장 에이전트',
      type: 'HEARTBEAT',
      agentId: 'farm-agent-001',
      interval: 60
    }
  });

  console.log('샘플 모니터 생성 완료');
}

main().catch(console.error).finally(() => prisma.$disconnect());

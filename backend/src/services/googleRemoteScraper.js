const puppeteer = require('puppeteer');

async function getGoogleRemoteStatus(email, password) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    );

    // 1. Google 로그인
    await page.goto('https://accounts.google.com/signin/v2/identifier', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // 이메일 입력
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', email, { delay: 50 });
    await page.click('#identifierNext, button[jsname="LgbsSe"]');
    await page.waitForTimeout(2000);

    // 비밀번호 입력
    await page.waitForSelector('input[type="password"]', { visible: true, timeout: 10000 });
    await page.type('input[type="password"]', password, { delay: 50 });
    await page.click('#passwordNext, button[jsname="LgbsSe"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

    // 2단계 인증 화면인지 확인
    const url = page.url();
    if (url.includes('challenge') || url.includes('signin/v2/challenge')) {
      return { success: false, error: '2단계 인증이 필요합니다. 구글 계정에서 2단계 인증을 비활성화하거나 앱 비밀번호를 사용하세요.', devices: [] };
    }

    // 2. 구글 원격 데스크톱 접속
    await page.goto('https://remotedesktop.google.com/access', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    await page.waitForTimeout(4000); // SPA 렌더링 대기

    // 3. 기기 목록 파싱
    const devices = await page.evaluate(() => {
      const results = [];
      const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);

      for (let i = 0; i < lines.length; i++) {
        const curr = lines[i];
        const next = lines[i + 1] || '';

        // 온라인 기기
        if (next === '온라인' || next === 'Online') {
          results.push({ name: curr, online: true });
          i++;
        }
        // 오프라인 기기
        else if (next.startsWith('마지막 온라인 연결') || next.startsWith('Last online')) {
          results.push({ name: curr, online: false, lastSeen: next });
          i++;
        }
      }
      return results;
    });

    return { success: true, devices };
  } catch (error) {
    return { success: false, error: error.message, devices: [] };
  } finally {
    await browser.close();
  }
}

module.exports = { getGoogleRemoteStatus };

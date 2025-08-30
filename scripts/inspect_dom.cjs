// CommonJS script for Puppeteer (package.json has "type": "module")
const puppeteer = require('puppeteer');

// Try IPv4 then IPv6 then localhost to handle binding/resolution quirks
(async () => {
  const ports = [5173, 5174, 5175, 5176, 5177];
  const hosts = ports.flatMap(p => ([`http://127.0.0.1:${p}/`, `http://[::1]:${p}/`, `http://localhost:${p}/`]));
  let browser;
  let page;
  let lastErr = null;
  for (const url of hosts) {
    try {
      console.log('Trying', url);
      browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
      console.log('Connected to', url);
      break;
    } catch (err) {
      lastErr = err;
      console.warn('Failed to connect to', url, err.message);
      if (browser) {
        try { await browser.close(); } catch (e) {}
        browser = null;
      }
    }
  }
  if (!page) {
    console.error('All connection attempts failed. Last error:', lastErr && lastErr.message);
    process.exit(2);
  }

  // Grab the fully rendered HTML
  const outer = await page.evaluate(() => document.documentElement.outerHTML);
  console.log('\n---OUTER_HTML_START---');
  console.log(outer.slice(0, 20000)); // print first 20k chars to avoid huge logs
  console.log('---OUTER_HTML_END---\n');

  // Computed styles checks
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log('BODY_BACKGROUND_COLOR:', bodyBg);

  const firstButtonInfo = await page.evaluate(() => {
    const b = document.querySelector('button');
    if (!b) return null;
    const s = getComputedStyle(b);
    return { tag: b.tagName, class: b.className, background: s.backgroundColor, color: s.color };
  });
  console.log('FIRST_BUTTON_INFO:', firstButtonInfo);

  const primaryStyles = await page.evaluate(() => {
    const sel = Array.from(document.querySelectorAll('[class*=\"primary\"], [class*=\"bg-primary\"], .text-primary-500'));
    return sel.slice(0, 8).map(e => ({ tag: e.tagName, class: e.className, background: getComputedStyle(e).backgroundColor, color: getComputedStyle(e).color }));
  });
  console.log('PRIMARY_ELEMENTS_SAMPLE_COUNT:', primaryStyles.length);
  console.log('PRIMARY_ELEMENTS_SAMPLE:', JSON.stringify(primaryStyles, null, 2));

  await browser.close();
  process.exit(0);
})();

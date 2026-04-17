import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

;(async () => {
  const outDir = path.join(__dirname, '..', '.playwright-output')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const logs = []
  try {
    logs.push({ type: 'info', message: 'launching browser' })
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
    const context = await browser.newContext()
    const page = await context.newPage()

    page.on('console', msg => {
      try { logs.push({ type: 'console', level: msg.type(), text: msg.text() }) } catch (e) {}
    })
    page.on('pageerror', err => {
      try { logs.push({ type: 'pageerror', message: err.message, stack: err.stack }) } catch (e) {}
    })
    page.on('requestfailed', req => {
      try { logs.push({ type: 'requestfailed', url: req.url(), method: req.method(), failure: (req.failure() && req.failure().errorText) || null }) } catch (e) {}
    })

    const base = 'http://localhost:3000'

    // Set admin/localStorage values before any navigation to avoid reloads that abort requests
    logs.push({ type: 'info', message: 'injecting localStorage admin session (before navigation)' })
    await page.evaluate(() => {
      try {
        localStorage.setItem('adminSession', JSON.stringify({ loggedIn: true, isLoggedIn: true, user: { id: 'local-admin', username: 'admin', rol: 'admin' }, timestamp: Date.now(), sessionDuration: 86400000 }))
        localStorage.setItem('kond-user', JSON.stringify({ id: 'local-admin', username: 'admin', email: 'admin@local', rol: 'admin', nombre: 'Admin' }))
        localStorage.setItem('currentUser', JSON.stringify({ id: 'local-admin', username: 'admin', email: 'admin@local', rol: 'admin', nombre: 'Admin' }))
        localStorage.setItem('kond-admin', JSON.stringify({ id: 'local-admin', username: 'admin', email: 'admin@local', rol: 'admin' }))
      } catch (e) {
        // swallow
      }
    })

    logs.push({ type: 'info', message: `goto ${base}` })
    await page.goto(base, { waitUntil: 'networkidle', timeout: 30000 })

    logs.push({ type: 'info', message: 'searching for /catalog link/button' })
    const candidates = await page.$$('a,button')
    let clicked = false
    for (const el of candidates) {
      try {
        const href = await el.getAttribute('href')
        const text = (await el.innerText()).trim()
        if (href && href.startsWith('/catalog')) {
          await el.click()
          logs.push({ type: 'info', message: `clicked href ${href}` })
          clicked = true
          break
        }
        if (/catálogo|catalogo|catalog/i.test(text)) {
          await el.click()
          logs.push({ type: 'info', message: `clicked text ${text}` })
          clicked = true
          break
        }
      } catch (e) {
        // ignore per-element errors
      }
    }

    if (!clicked) {
      logs.push({ type: 'info', message: 'direct navigate to /catalog' })
      await page.goto(base + '/catalog', { waitUntil: 'networkidle', timeout: 30000 })
    }

    // wait for potential errors to surface
    await page.waitForTimeout(3000)

    const screenshotPath = path.join(outDir, 'screenshot.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })

    await browser.close()

    fs.writeFileSync(path.join(outDir, 'logs.json'), JSON.stringify(logs, null, 2))
    console.log('PLAYWRIGHT_DONE', screenshotPath)
    console.log(JSON.stringify(logs, null, 2))
    process.exit(0)
  } catch (err) {
    logs.push({ type: 'error', message: err.message, stack: err.stack })
    try { fs.writeFileSync(path.join(outDir, 'logs.json'), JSON.stringify(logs, null, 2)) } catch (e) {}
    console.error('PLAYWRIGHT_ERROR', err)
    console.error(JSON.stringify(logs, null, 2))
    process.exit(2)
  }
})()

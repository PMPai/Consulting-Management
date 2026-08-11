import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

const FRONTEND = 'http://localhost:8898'
const API = 'http://localhost:8000/api/v1'

let token: string | null = null

async function apiLogin(request: APIRequestContext): Promise<string> {
  const resp = await request.post(`${API}/auth/login`, {
    data: { email: 'admin@demo.com', password: 'demo1234' },
  })
  expect(resp.ok()).toBeTruthy()
  const body = await resp.json()
  return body.data.tokens.access_token
}

async function ensureToken(request: APIRequestContext): Promise<string> {
  if (!token) token = await apiLogin(request)
  return token
}

async function loginViaUI(page: Page, request: APIRequestContext): Promise<void> {
  const t = await ensureToken(request)
  await page.addInitScript((t) => { localStorage.setItem('token', t) }, t)
  await page.goto(FRONTEND)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
}

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto(FRONTEND)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should login via UI', async ({ page }) => {
    await page.goto(FRONTEND)
    await page.waitForLoadState('networkidle')
    await page.locator('input[type="email"]').fill('admin@demo.com')
    await page.locator('input[type="password"]').fill('demo1234')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(5000)
    await expect(page.locator('.sidebar')).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Navigation and Layout', () => {
  test.beforeEach(async ({ page, request }) => { await loginViaUI(page, request) })

  test('should display sidebar with 8 menu items', async ({ page }) => {
    await expect(page.locator('.nav-item')).toHaveCount(8)
  })

  test('should display logo in sidebar', async ({ page }) => {
    await expect(page.locator('.sidebar-brand img')).toBeVisible()
  })

  test('should display page header bar', async ({ page }) => {
    await expect(page.locator('.page-header').first()).toBeVisible()
  })

  test('should collapse sidebar', async ({ page }) => {
    const sidebar = page.locator('.sidebar')
    await expect(sidebar).not.toHaveClass(/collapsed/)
    await page.locator('.sidebar-toggle').click()
    await expect(sidebar).toHaveClass(/collapsed/)
  })
})

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page, request }) => { await loginViaUI(page, request) })

  test('should show page title in header', async ({ page }) => {
    await expect(page.locator('.page-title')).toContainText('总览')
  })

  test('should display 4 KPI cards', async ({ page }) => {
    await expect(page.locator('.kpi-card')).toHaveCount(4)
  })

  test('should show ROI as first KPI', async ({ page }) => {
    await expect(page.locator('.kpi-label').first()).toContainText('ROI')
  })

  test('should display Gantt chart', async ({ page }) => {
    await expect(page.locator('.section-title:has-text("甘特图")')).toBeVisible({ timeout: 15000 })
  })

  test('should display investment vs benefit chart', async ({ page }) => {
    await expect(page.locator('.section-title:has-text("收益")')).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Projects Page', () => {
  test.beforeEach(async ({ page, request }) => { await loginViaUI(page, request) })

  test('should navigate to projects', async ({ page }) => {
    await page.locator('a[href="/projects"]').click()
    await page.waitForTimeout(2000)
    await expect(page.locator('.page-title')).toContainText('项目')
  })

  test('should show project list', async ({ page }) => {
    await page.locator('a[href="/projects"]').click()
    await page.waitForTimeout(3000)
    const rows = page.locator('.data-table tbody tr')
    expect(await rows.count()).toBeGreaterThan(0)
  })

  test('should open new project modal', async ({ page }) => {
    await page.locator('a[href="/projects"]').click()
    await page.waitForTimeout(3000)
    await page.locator('button:has-text("新建")').click()
    await expect(page.locator('.modal')).toBeVisible()
  })
})

test.describe('Other Pages', () => {
  test.beforeEach(async ({ page, request }) => { await loginViaUI(page, request) })

  test('should navigate to time tracking', async ({ page }) => {
    await page.locator('a[href="/time"]').click()
    await page.waitForTimeout(2000)
    await expect(page.locator('.page-title')).toContainText('工时')
  })

  test('should navigate to expenses', async ({ page }) => {
    await page.locator('a[href="/expenses"]').click()
    await page.waitForTimeout(2000)
    await expect(page.locator('.page-title')).toContainText('费用')
  })

  test('should navigate to ROI page', async ({ page }) => {
    await page.locator('a[href="/roi"]').click()
    await page.waitForTimeout(2000)
    await expect(page.locator('.page-title')).toContainText('ROI')
  })

  test('should navigate to reports', async ({ page }) => {
    await page.locator('a[href="/reports"]').click()
    await page.waitForTimeout(2000)
    await expect(page.locator('.page-title')).toContainText('报表')
  })

  test('should navigate to API page', async ({ page }) => {
    await page.locator('a[href="/api"]').click()
    await page.waitForTimeout(2000)
    await expect(page.locator('.page-title')).toContainText('API')
  })

  test('should not show webhook section', async ({ page }) => {
    await page.locator('a[href="/api"]').click()
    await page.waitForTimeout(2000)
    await expect(page.locator('text=Webhook')).not.toBeVisible()
  })

  test('should navigate to settings', async ({ page }) => {
    await page.locator('a[href="/settings"]').click()
    await page.waitForTimeout(2000)
    await expect(page.locator('.page-title')).toContainText('设置')
  })
})

test.describe('API Verification', () => {
  test('should verify ROI endpoint', async ({ request }) => {
    const t = await ensureToken(request)
    const pr = await request.get(`${API}/projects`, { headers: { Authorization: `Bearer ${t}` } })
    const pb = await pr.json()
    const pid = pb.data[0].id
    const rr = await request.get(`${API}/aggregations/projects/${pid}/roi-summary`, { headers: { Authorization: `Bearer ${t}` } })
    const rb = await rr.json()
    expect(rb.data.total_investment).toBe('60000.00')
    expect(rb.data.total_verified_benefit).toBe('30000.00')
  })

  test('should verify clients endpoint', async ({ request }) => {
    const t = await ensureToken(request)
    const r = await request.get(`${API}/clients`, { headers: { Authorization: `Bearer ${t}` } })
    const b = await r.json()
    expect(b.data.length).toBeGreaterThan(0)
  })

  test('should verify phases endpoint', async ({ request }) => {
    const t = await ensureToken(request)
    const r = await request.get(`${API}/phases`, { headers: { Authorization: `Bearer ${t}` } })
    const b = await r.json()
    expect(b.data.length).toBeGreaterThan(0)
  })

  test('should verify role-rates endpoint', async ({ request }) => {
    const t = await ensureToken(request)
    const r = await request.get(`${API}/role-rates`, { headers: { Authorization: `Bearer ${t}` } })
    const b = await r.json()
    expect(b.data.length).toBe(4)
    expect(b.data.find((r: { role: string }) => r.role === 'assistant')).toBeTruthy()
  })

  test('should verify no webhook endpoints', async ({ request }) => {
    const t = await ensureToken(request)
    const r = await request.get(`${API}/webhook-subscriptions`, { headers: { Authorization: `Bearer ${t}` } })
    expect(r.status()).toBe(404)
  })
})

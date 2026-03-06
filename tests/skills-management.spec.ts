import { test, expect } from '@playwright/test'
import { API_KEY_HEADER } from './helpers'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

test.describe('Skills Management', () => {
  const testSkillsDir = path.join(os.homedir(), '.claude', 'skills')
  const testConfigPath = path.join(os.homedir(), '.openclaw', 'openclaw.json')
  let configBackup: string | null = null

  test.beforeEach(async () => {
    // Backup existing config if it exists
    if (fs.existsSync(testConfigPath)) {
      configBackup = fs.readFileSync(testConfigPath, 'utf-8')
    }

    // Create test skill if it doesn't exist
    const testSkillDir = path.join(testSkillsDir, 'e2e-test-skill')
    if (!fs.existsSync(testSkillDir)) {
      fs.mkdirSync(testSkillDir, { recursive: true })
      fs.writeFileSync(
        path.join(testSkillDir, 'SKILL.md'),
        `---
name: e2e-test-skill
description: Test skill for E2E testing
---

Test skill content`
      )
    }
  })

  test.afterEach(async () => {
    // Restore config backup
    if (configBackup) {
      fs.writeFileSync(testConfigPath, configBackup)
    }

    // Clean up test skill
    const testSkillDir = path.join(testSkillsDir, 'e2e-test-skill')
    if (fs.existsSync(testSkillDir)) {
      fs.rmSync(testSkillDir, { recursive: true, force: true })
    }
  })

  // ── API Tests ────────────────────────────────────

  test('GET /api/skills returns list of skills', async ({ request }) => {
    const res = await request.get('/api/skills', {
      headers: API_KEY_HEADER,
    })

    expect(res.status()).toBe(200)
    const body = await res.json()

    expect(body.skills).toBeDefined()
    expect(Array.isArray(body.skills)).toBe(true)
    expect(body.skills.length).toBeGreaterThan(0)

    // Check skill structure
    const skill = body.skills[0]
    expect(skill).toHaveProperty('name')
    expect(skill).toHaveProperty('description')
    expect(skill).toHaveProperty('enabled')
    expect(skill).toHaveProperty('path')
  })

  test('GET /api/skills requires admin role', async ({ request }) => {
    const res = await request.get('/api/skills')

    expect(res.status()).toBe(403)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  test('PUT /api/skills updates skill state', async ({ request }) => {
    const res = await request.put('/api/skills', {
      headers: API_KEY_HEADER,
      data: {
        updates: {
          'e2e-test-skill': false,
        },
      },
    })

    expect(res.status()).toBe(200)
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.count).toBe(1)

    // Verify config was updated
    const config = JSON.parse(fs.readFileSync(testConfigPath, 'utf-8'))
    expect(config.skills.disabled).toContain('e2e-test-skill')
  })

  test('PUT /api/skills requires admin role', async ({ request }) => {
    const res = await request.put('/api/skills', {
      data: {
        updates: {
          'test-skill': true,
        },
      },
    })

    expect(res.status()).toBe(403)
  })

  test('PUT /api/skills validates request body', async ({ request }) => {
    const res = await request.put('/api/skills', {
      headers: API_KEY_HEADER,
      data: {
        invalid: 'data',
      },
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  test('PUT /api/skills handles multiple skill updates', async ({ request }) => {
    const res = await request.put('/api/skills', {
      headers: API_KEY_HEADER,
      data: {
        updates: {
          'e2e-test-skill': true,
          'frontend-design': false,
        },
      },
    })

    expect(res.status()).toBe(200)
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.count).toBe(2)

    // Verify config
    const config = JSON.parse(fs.readFileSync(testConfigPath, 'utf-8'))
    expect(config.skills.enabled).toContain('e2e-test-skill')
    expect(config.skills.disabled).toContain('frontend-design')
  })

  // ── UI Tests ─────────────────────────────────────

  test('Skills panel loads and displays skills', async ({ page }) => {
    await page.goto('/skills')

    // Wait for panel to load
    await page.waitForSelector('h2:has-text("Skills")')

    // Check header
    await expect(page.locator('h2')).toContainText('Skills')
    await expect(page.locator('text=Manage Claude skills and capabilities')).toBeVisible()

    // Check search bar
    await expect(page.locator('input[placeholder="Search skills..."]')).toBeVisible()

    // Check that skills are displayed
    const skillCards = page.locator('[class*="bg-card"][class*="border"][class*="rounded"]')
    await expect(skillCards.first()).toBeVisible()
  })

  test('Skills panel search functionality', async ({ page }) => {
    await page.goto('/skills')
    await page.waitForSelector('h2:has-text("Skills")')

    // Get initial skill count
    const searchInput = page.locator('input[placeholder="Search skills..."]')
    await searchInput.fill('frontend')

    // Wait for filter to apply
    await page.waitForTimeout(300)

    // Should show filtered results
    await expect(page.locator('text=frontend-design')).toBeVisible()

    // Search for non-existent skill
    await searchInput.fill('nonexistent-skill-xyz')
    await page.waitForTimeout(300)

    // Should show "no skills found" message
    await expect(page.locator('text=No skills found matching your search')).toBeVisible()
  })

  test('Skills panel toggle functionality', async ({ page }) => {
    await page.goto('/skills')
    await page.waitForSelector('h2:has-text("Skills")')

    // Find the first skill card
    const skillCard = page.locator('[class*="bg-card"][class*="border"][class*="rounded"]').first()

    // Find the toggle button within the card
    const toggleButton = skillCard.locator('button[title*="Enabled"], button[title*="Disabled"]').last()

    // Click the toggle
    await toggleButton.click()

    // Wait for UI update
    await page.waitForTimeout(300)

    // Check that "modified" badge appears
    await expect(skillCard.locator('text=modified')).toBeVisible()

    // Check that unsaved changes indicator appears
    await expect(page.locator('text=unsaved change')).toBeVisible()
  })

  test('Skills panel save changes workflow', async ({ page }) => {
    await page.goto('/skills')
    await page.waitForSelector('h2:has-text("Skills")')

    // Toggle a skill
    const skillCard = page.locator('[class*="bg-card"][class*="border"][class*="rounded"]').first()
    const toggleButton = skillCard.locator('button[title*="Enabled"], button[title*="Disabled"]').last()
    await toggleButton.click()

    // Wait for UI update
    await page.waitForTimeout(300)

    // Click Save Changes button
    const saveButton = page.locator('button:has-text("Save Changes")').first()
    await saveButton.click()

    // Wait for save to complete
    await page.waitForTimeout(500)

    // Check for success feedback
    await expect(page.locator('text=Updated')).toBeVisible()

    // Unsaved changes indicator should disappear
    await expect(page.locator('text=unsaved change')).not.toBeVisible()
  })

  test('Skills panel discard changes workflow', async ({ page }) => {
    await page.goto('/skills')
    await page.waitForSelector('h2:has-text("Skills")')

    // Toggle a skill
    const skillCard = page.locator('[class*="bg-card"][class*="border"][class*="rounded"]').first()
    const toggleButton = skillCard.locator('button[title*="Enabled"], button[title*="Disabled"]').last()
    await toggleButton.click()

    // Wait for UI update
    await page.waitForTimeout(300)

    // Verify modified badge is visible
    await expect(skillCard.locator('text=modified')).toBeVisible()

    // Click Discard button
    const discardButton = page.locator('button:has-text("Discard")').first()
    await discardButton.click()

    // Wait for UI update
    await page.waitForTimeout(300)

    // Modified badge should be gone
    await expect(skillCard.locator('text=modified')).not.toBeVisible()

    // Unsaved changes indicator should disappear
    await expect(page.locator('text=unsaved change')).not.toBeVisible()
  })

  test('Skills panel shows skill count and enabled count', async ({ page }) => {
    await page.goto('/skills')
    await page.waitForSelector('h2:has-text("Skills")')

    // Check for skill count display
    await expect(page.locator('text=/\\d+ skill/')).toBeVisible()
    await expect(page.locator('text=/\\d+ enabled/')).toBeVisible()
  })

  test('Skills panel loading state', async ({ page }) => {
    // Navigate to skills panel
    await page.goto('/skills')

    // Should show loading state initially
    const loadingIndicator = page.locator('text=Loading skills...')

    // Wait for either loading to appear or content to load
    try {
      await loadingIndicator.waitFor({ timeout: 1000 })
    } catch {
      // Loading was too fast, that's OK
    }

    // Eventually should show content
    await page.waitForSelector('h2:has-text("Skills")', { timeout: 5000 })
  })

  test('Skills panel displays configure button (disabled)', async ({ page }) => {
    await page.goto('/skills')
    await page.waitForSelector('h2:has-text("Skills")')

    // Find configure button in first skill card
    const skillCard = page.locator('[class*="bg-card"][class*="border"][class*="rounded"]').first()
    const configureButton = skillCard.locator('button').first()

    // Should be disabled
    await expect(configureButton).toBeDisabled()
  })

  test('Skills panel navigation integration', async ({ page }) => {
    await page.goto('/')

    // Find and click Skills nav item (if visible in viewport)
    // Note: Nav might be collapsed on mobile
    const skillsNavItem = page.locator('[href="/skills"]').first()

    if (await skillsNavItem.isVisible()) {
      await skillsNavItem.click()
      await page.waitForURL('/skills')
      await expect(page.locator('h2:has-text("Skills")')).toBeVisible()
    } else {
      // Directly navigate if nav is not visible
      await page.goto('/skills')
      await expect(page.locator('h2:has-text("Skills")')).toBeVisible()
    }
  })

  test('Skills config persists across page reloads', async ({ page }) => {
    await page.goto('/skills')
    await page.waitForSelector('h2:has-text("Skills")')

    // Get the name of the first skill
    const firstSkillCard = page.locator('[class*="bg-card"][class*="border"][class*="rounded"]').first()
    const skillName = await firstSkillCard.locator('[class*="font-medium"]').first().textContent()

    // Toggle and save
    const toggleButton = firstSkillCard.locator('button[title*="Enabled"], button[title*="Disabled"]').last()
    const initialState = (await toggleButton.getAttribute('title'))?.toLowerCase().includes('enabled')

    await toggleButton.click()
    await page.waitForTimeout(300)

    const saveButton = page.locator('button:has-text("Save Changes")').first()
    await saveButton.click()
    await page.waitForTimeout(500)

    // Reload page
    await page.reload()
    await page.waitForSelector('h2:has-text("Skills")')

    // Find the same skill again and verify state changed
    const reloadedSkillCard = page.locator(`text=${skillName}`).locator('..').locator('..')
    const reloadedToggleButton = reloadedSkillCard.locator('button[title*="Enabled"], button[title*="Disabled"]').last()
    const newState = (await reloadedToggleButton.getAttribute('title'))?.toLowerCase().includes('enabled')

    expect(newState).not.toBe(initialState)
  })
})

/**
 * Bot Journey — Visual Regression
 *
 * Mirrors: tests/e2e/tests/bot-journey.spec.ts
 * Journey: #4 Bot Automation (USER-JOURNEYS.md)
 *
 * Captures the full bot lifecycle with UI interactions:
 * 1. Bots list page
 * 2. Bot editor — empty (new bot)
 * 3. Trigger accordion expanded (service dropdown visible)
 * 4. Webhook selected (trigger URL displayed)
 * 5. Action task added (second task visible)
 * 6. Configured bot (tasks with code service)
 * 7. Test result displayed
 * 8. Bot activated (deployed state)
 * 9. Bot logs page
 */
import { expect, test } from '@playwright/test'

import { API_URL, getApiHeaders, getAuth, waitForPageReady } from '../helpers'

test.describe.configure({ mode: 'serial' })

test.describe('Bot Journey', () => {
  let botId: string

  test.afterAll(async ({ request }) => {
    if (botId) {
      await request
        .delete(`${API_URL}/bots/${botId}`, {
          headers: getApiHeaders(),
        })
        .catch(() => {})
    }
  })

  test('bots list page', async ({ page }) => {
    await page.goto('/bots')
    await waitForPageReady(page)

    await expect(page).toHaveScreenshot('bots-list.png', {
      fullPage: true,
    })
  })

  test('bot editor — empty', async ({ page, request }) => {
    const res = await request.post(`${API_URL}/bots`, {
      headers: getApiHeaders(),
      data: {},
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.data?.botId).toBeTruthy()
    botId = body.data.botId

    await page.goto(`/bots/${botId}`)
    await waitForPageReady(page)

    await expect(page).toHaveScreenshot('bot-editor-empty.png', {
      fullPage: true,
    })
  })

  test('bot editor — trigger accordion expanded', async ({ page }) => {
    await page.goto(`/bots/${botId}`)
    await waitForPageReady(page)

    // Click the Service accordion to expand it (reveals service picker)
    const serviceAccordion = page
      .locator('.MuiAccordionSummary-root', { hasText: 'Service' })
      .first()
    await expect(serviceAccordion).toBeVisible()
    await serviceAccordion.click()
    await page.waitForTimeout(300)

    // Assert: service selection area is visible inside expanded accordion
    await expect(
      page.locator('.MuiAccordionDetails-root').first()
    ).toBeVisible()

    await expect(page).toHaveScreenshot('bot-trigger-expanded.png', {
      fullPage: true,
    })
  })

  test('bot editor — webhook selected with URL', async ({ page, request }) => {
    const patchRes = await request.patch(`${API_URL}/bots/${botId}`, {
      headers: getApiHeaders(),
      data: {
        name: 'Visual Test Bot',
        active: false,
        tasks: [
          {
            taskId: 1,
            inputData: [],
            app: {
              appId: 'baita',
              name: 'Baita',
              icon: '/icons/baita.svg',
              config: {},
            },
            service: {
              type: 'trigger',
              name: 'webhook',
              label: 'Webhook',
              config: {},
            },
          },
        ],
      },
    })
    const patchBody = await patchRes.json()
    expect(patchBody.success, `PATCH: ${patchBody.message}`).toBeTruthy()

    await page.goto(`/bots/${botId}`)
    await waitForPageReady(page)

    // The Service accordion is visible — click it to expand and reveal webhook URL
    const serviceAccordion = page
      .locator('.MuiAccordionSummary-root', { hasText: 'Service' })
      .first()
    await expect(serviceAccordion).toBeVisible()
    await serviceAccordion.click()
    await page.waitForTimeout(500)

    // Assert: the webhook URL component is rendered
    const urlComponent = page.locator('text=URL:')
    await expect(urlComponent).toBeVisible({ timeout: 5000 })

    await expect(page).toHaveScreenshot('bot-webhook-url.png', {
      fullPage: true,
    })
  })

  test('bot editor — action task added', async ({ page, request }) => {
    const res = await request.patch(`${API_URL}/bots/${botId}`, {
      headers: getApiHeaders(),
      data: {
        name: 'Visual Test Bot',
        active: false,
        tasks: [
          {
            taskId: 1,
            inputData: [],
            app: {
              appId: 'baita',
              name: 'Baita',
              icon: '/icons/baita.svg',
              config: {},
            },
            service: {
              type: 'trigger',
              name: 'webhook',
              label: 'Webhook',
              config: {},
            },
          },
          {
            taskId: 2,
            inputData: [
              {
                name: 'code',
                label: 'Code',
                type: 'code',
                value: 'return { message: "hello" }',
              },
            ],
            app: {
              appId: 'baita',
              name: 'Baita',
              icon: '/icons/baita.svg',
              config: {},
            },
            service: {
              type: 'invoke',
              name: 'code-execute',
              label: 'Run Javascript',
              config: { customFields: true },
            },
          },
        ],
      },
    })
    const body = await res.json()
    expect(body.success, `PATCH: ${body.message}`).toBeTruthy()

    await page.goto(`/bots/${botId}`)
    await waitForPageReady(page)

    // Assert: second task (Run Javascript) is visible in the task list
    await expect(page.locator('text=Run Javascript').first()).toBeVisible()

    await expect(page).toHaveScreenshot('bot-with-action-task.png', {
      fullPage: true,
    })
  })

  test('bot editor — test result', async ({ page, request }) => {
    const task = {
      taskId: 2,
      service: {
        type: 'invoke',
        name: 'code-execute',
        label: 'Run Javascript',
        config: {
          inputFields: [
            { name: 'code', label: 'Code', type: 'code', required: true },
          ],
        },
      },
      inputData: [
        {
          name: 'code',
          label: 'Code',
          type: 'code',
          value: 'output = { message: "hello from visual test" }',
          sampleValue: 'output = { message: "hello from visual test" }',
        },
      ],
    }

    const testRes = await request.post(`${API_URL}/bots/${botId}/test`, {
      headers: getApiHeaders(),
      data: { task, taskIndex: 1 },
    })
    const testBody = await testRes.json()
    expect(testBody.success).toBeTruthy()

    await page.goto(`/bots/${botId}`)
    await waitForPageReady(page)

    // Expand the Test sub-accordion for the action task (second task)
    const testAccordion = page
      .locator('.MuiAccordionSummary-root', { hasText: 'Test' })
      .last()
    await expect(testAccordion).toBeVisible()
    await testAccordion.click()
    await page.waitForTimeout(500)

    // Assert: test result with status and output is displayed
    await expect(page.locator('text=success').first()).toBeVisible({
      timeout: 5000,
    })
    await expect(page.locator('text=hello from visual test')).toBeVisible()

    await expect(page).toHaveScreenshot('bot-test-result.png', {
      fullPage: true,
    })
  })

  test('bot editor — deployed (active)', async ({ page, request }) => {
    const deployRes = await request.post(`${API_URL}/bots/${botId}/deploy`, {
      headers: getApiHeaders(),
      data: {
        botId,
        name: 'Visual Test Bot',
        active: true,
        tasks: [
          {
            taskId: 1,
            inputData: [],
            app: {
              appId: 'baita',
              name: 'Baita',
              icon: '/icons/baita.svg',
              config: {},
            },
            service: {
              type: 'trigger',
              name: 'webhook',
              label: 'Webhook',
              config: {},
            },
          },
          {
            taskId: 2,
            inputData: [
              {
                name: 'code',
                label: 'Code',
                type: 'code',
                value: 'return { message: "hello" }',
              },
            ],
            app: {
              appId: 'baita',
              name: 'Baita',
              icon: '/icons/baita.svg',
              config: {},
            },
            service: {
              type: 'invoke',
              name: 'code-execute',
              label: 'Run Javascript',
              config: { customFields: true },
            },
          },
        ],
      },
    })
    const deployBody = await deployRes.json()
    expect(deployBody.success, `Deploy: ${deployBody.message}`).toBeTruthy()

    await page.goto(`/bots/${botId}`)
    await waitForPageReady(page)

    // Assert: bot is active (Turn off button visible = bot is on)
    await expect(page.getByRole('button', { name: 'Turn off' })).toBeVisible()

    await expect(page).toHaveScreenshot('bot-deployed-active.png', {
      fullPage: true,
    })
  })

  test('bot logs page', async ({ page }) => {
    await page.goto(`/bots/${botId}/logs`)
    await waitForPageReady(page)

    await expect(page).toHaveScreenshot('bot-logs.png', {
      fullPage: true,
    })
  })
})

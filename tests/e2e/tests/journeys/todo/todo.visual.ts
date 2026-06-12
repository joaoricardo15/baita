/**
 * To-Do Journey — Visual Regression
 *
 * Journey: #2 To-Do Management (USER-JOURNEYS.md)
 *
 * Captures the todo page across all key states:
 * 1. Empty state (no tasks)
 * 2. Single task
 * 3. Multiple tasks in order
 * 4. After adding a new task
 * 5. Completed tasks filtered
 * 6. After completing a task
 */
import { expect, test } from '@playwright/test'

import { API_URL, getApiHeaders, waitForPageReady } from '../helpers'

test.describe.configure({ mode: 'serial' })

test.describe('Todo Journey', () => {
  const testPrefix = `visual-todo-${Date.now()}`

  test.afterAll(async ({ request }) => {
    const res = await request.get(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
    })
    const body = await res.json()
    if (body.data?.tasks) {
      const tasks = body.data.tasks.filter(
        (t: { taskId: string }) => !t.taskId.startsWith('visual-todo-')
      )
      await request.put(`${API_URL}/data/todo`, {
        headers: getApiHeaders(),
        data: { tasks },
      })
    }
  })

  test('todo list — empty state', async ({ page, request }) => {
    const putRes = await request.put(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
      data: { tasks: [] },
    })
    const putBody = await putRes.json()
    expect(putBody.success, `PUT empty: ${putBody.message}`).toBeTruthy()

    await page.goto('/todo')
    await waitForPageReady(page)

    // Assert: input placeholder is visible (empty state shows text input)
    const input = page.getByPlaceholder('Next thing to do here...')
    await expect(input).toBeVisible()

    // Assert: no task items rendered (only the add input)
    const checkboxes = page.locator('.MuiCheckbox-root')
    expect(await checkboxes.count()).toBe(0)

    await expect(page).toHaveScreenshot('todo-empty.png', {
      fullPage: true,
    })
  })

  test('todo list — single task', async ({ page, request }) => {
    const putRes = await request.put(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
      data: {
        tasks: [
          {
            taskId: `${testPrefix}-1`,
            title: 'Buy groceries',
            done: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      },
    })
    const putBody = await putRes.json()
    expect(putBody.success, `PUT: ${putBody.message}`).toBeTruthy()

    // Verify data is stored before navigating
    const getRes = await request.get(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
    })
    const getData = await getRes.json()
    expect(
      getData.data?.tasks?.length,
      `GET after PUT returned ${JSON.stringify(getData.data?.tasks)}`
    ).toBe(1)

    await page.goto('/todo')
    await waitForPageReady(page)

    // Assert: task is rendered (title appears as input value)
    const taskInput = page.locator('input[value="Buy groceries"]')
    await expect(taskInput).toBeVisible({ timeout: 10000 })

    // Assert: checkbox is present
    const checkbox = page.locator('.MuiCheckbox-root').first()
    await expect(checkbox).toBeVisible()

    // Assert: no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)

    await expect(page).toHaveScreenshot('todo-single-task.png', {
      fullPage: true,
    })
  })

  test('todo list — multiple tasks', async ({ page, request }) => {
    const putRes = await request.put(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
      data: {
        tasks: [
          {
            taskId: `${testPrefix}-a`,
            title: 'First priority task',
            done: false,
            createdAt: Date.now() - 3000,
            updatedAt: Date.now() - 3000,
          },
          {
            taskId: `${testPrefix}-b`,
            title: 'Second priority task',
            done: false,
            createdAt: Date.now() - 2000,
            updatedAt: Date.now() - 2000,
          },
          {
            taskId: `${testPrefix}-c`,
            title: 'Third priority task',
            done: false,
            createdAt: Date.now() - 1000,
            updatedAt: Date.now() - 1000,
          },
        ],
      },
    })
    const putBody = await putRes.json()
    expect(putBody.success, `PUT: ${putBody.message}`).toBeTruthy()

    // Verify data persisted
    const verifyRes = await request.get(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
    })
    const verifyData = await verifyRes.json()
    expect(verifyData.data?.tasks?.length).toBe(3)

    await page.goto('/todo')
    await waitForPageReady(page)

    // Assert: all 3 tasks rendered (as input values)
    await expect(
      page.locator('input[value="First priority task"]')
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.locator('input[value="Second priority task"]')
    ).toBeVisible()
    await expect(
      page.locator('input[value="Third priority task"]')
    ).toBeVisible()

    // Assert: 3 checkboxes
    const checkboxes = page.locator('.MuiCheckbox-root')
    expect(await checkboxes.count()).toBe(3)

    // Assert: viewport width respected
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)

    await expect(page).toHaveScreenshot('todo-multiple-tasks.png', {
      fullPage: true,
    })
  })

  test('todo list — after adding task', async ({ page, request }) => {
    const res = await request.get(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
    })
    const body = await res.json()
    const tasks = body.data?.tasks || []

    tasks.push({
      taskId: `${testPrefix}-new`,
      title: 'Visual test task',
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    const putRes = await request.put(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
      data: { tasks },
    })
    const putBody = await putRes.json()
    expect(putBody.success, `PUT: ${putBody.message}`).toBeTruthy()

    // Verify data persisted before navigating
    const verifyRes = await request.get(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
    })
    const verifyData = await verifyRes.json()
    expect(
      verifyData.data?.tasks?.length,
      `GET after PUT: expected ${tasks.length} tasks`
    ).toBe(tasks.length)

    await page.goto('/todo')
    await waitForPageReady(page)

    // Assert: new task is visible
    await expect(page.locator('input[value="Visual test task"]')).toBeVisible({
      timeout: 10000,
    })

    // Assert: task count increased (4 tasks now)
    const checkboxes = page.locator('.MuiCheckbox-root')
    expect(await checkboxes.count()).toBe(4)

    await expect(page).toHaveScreenshot('todo-with-new-task.png', {
      fullPage: true,
    })
  })

  test('todo list — completed tasks filtered', async ({ page, request }) => {
    const putRes = await request.put(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
      data: {
        tasks: [
          {
            taskId: `${testPrefix}-active`,
            title: 'Still active task',
            done: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            taskId: `${testPrefix}-done1`,
            title: 'Completed task one',
            done: true,
            createdAt: Date.now() - 5000,
            updatedAt: Date.now(),
          },
        ],
      },
    })
    const putBody = await putRes.json()
    expect(putBody.success, `PUT: ${putBody.message}`).toBeTruthy()

    // Verify data persisted
    const verifyRes = await request.get(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
    })
    const verifyData = await verifyRes.json()
    expect(verifyData.data?.tasks?.length).toBe(2)

    await page.goto('/todo')
    await waitForPageReady(page)

    // Assert: active task is visible
    await expect(page.locator('input[value="Still active task"]')).toBeVisible({
      timeout: 10000,
    })

    await expect(page).toHaveScreenshot('todo-completed-filtered.png', {
      fullPage: true,
    })
  })

  test('todo list — after completing a task', async ({ page, request }) => {
    const putRes = await request.put(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
      data: {
        tasks: [
          {
            taskId: `${testPrefix}-remain`,
            title: 'Remaining task',
            done: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            taskId: `${testPrefix}-completed`,
            title: 'Just completed',
            done: true,
            createdAt: Date.now() - 2000,
            updatedAt: Date.now(),
          },
        ],
      },
    })
    const putBody = await putRes.json()
    expect(putBody.success, `PUT: ${putBody.message}`).toBeTruthy()

    // Verify data persisted
    const verifyRes = await request.get(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
    })
    const verifyData = await verifyRes.json()
    expect(verifyData.data?.tasks?.length).toBe(2)

    await page.goto('/todo')
    await waitForPageReady(page)

    // Assert: remaining undone task is visible
    await expect(page.locator('input[value="Remaining task"]')).toBeVisible({
      timeout: 10000,
    })

    await expect(page).toHaveScreenshot('todo-task-completed.png', {
      fullPage: true,
    })
  })
})

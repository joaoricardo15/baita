/**
 * To-Do Journey — Visual Regression
 *
 * Mirrors: tests/e2e/tests/todo-journey.spec.ts
 * Journey: #2 To-Do Management (USER-JOURNEYS.md)
 *
 * Captures the todo page at key states:
 * 1. Initial load (existing tasks)
 * 2. After creating a task
 * 3. After completing a task
 */
import { expect, test } from '@playwright/test'

import { API_URL, getApiHeaders, getAuth, waitForPageReady } from '../helpers'

test.describe.configure({ mode: 'serial' })

test.describe('Todo Journey', () => {
  const taskId = `visual-todo-${Date.now()}`

  test.afterAll(async ({ request }) => {
    const res = await request.get(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
    })
    const body = await res.json()
    if (body.data?.tasks) {
      const tasks = body.data.tasks.filter(
        (t: { taskId: string }) => t.taskId !== taskId
      )
      await request.put(`${API_URL}/data/todo`, {
        headers: getApiHeaders(),
        data: { tasks },
      })
    }
  })

  test('todo list — initial state', async ({ page }) => {
    await page.goto('/todo')
    await waitForPageReady(page)

    await expect(page).toHaveScreenshot('todo-initial.png', {
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
      taskId,
      title: 'Visual test task',
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    await request.put(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
      data: { tasks },
    })

    await page.goto('/todo')
    await waitForPageReady(page)

    await expect(page).toHaveScreenshot('todo-with-new-task.png', {
      fullPage: true,
    })
  })

  test('todo list — after completing task', async ({ page, request }) => {
    const res = await request.get(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
    })
    const body = await res.json()
    const tasks = (body.data?.tasks || []).map(
      (t: { taskId: string; done: boolean }) =>
        t.taskId === taskId ? { ...t, done: true } : t
    )

    await request.put(`${API_URL}/data/todo`, {
      headers: getApiHeaders(),
      data: { tasks },
    })

    await page.goto('/todo')
    await waitForPageReady(page)

    await expect(page).toHaveScreenshot('todo-task-completed.png', {
      fullPage: true,
    })
  })
})

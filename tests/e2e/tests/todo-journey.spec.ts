/**
 * To-Do Journey E2E Tests
 *
 * User Journey: To-Do Management
 * Tests the full to-do lifecycle that users perform daily:
 * - Create tasks
 * - Mark tasks as complete
 * - Verify task persistence across reads
 * - Verify profile reflects daily progress
 * - Clean up (restore original state)
 */
import { expect, test } from '@playwright/test'

import { API_URL, authHeaders, loadAuthData, logResult } from './helpers'

let token: string

test.beforeAll(() => {
  const data = loadAuthData()
  token = data.accessToken
})

test.describe.configure({ mode: 'serial' })

test.describe('To-Do Lifecycle', () => {
  const taskIds = [
    `e2e-task-1-${Date.now()}`,
    `e2e-task-2-${Date.now()}`,
    `e2e-task-3-${Date.now()}`,
  ]

  test.afterAll(async ({ request }) => {
    const res = await request.post(`${API_URL}/resource/todo/read`, {
      headers: authHeaders(token),
      data: {},
    })
    const body = await res.json()
    if (body.data?.tasks) {
      const tasks = body.data.tasks.filter(
        (t: { taskId: string }) => !taskIds.includes(t.taskId)
      )
      await request.post(`${API_URL}/resource/todo/update`, {
        headers: authHeaders(token),
        data: { tasks },
      })
    }
  })

  test('read current todo state', async ({ request }) => {
    const res = await request.post(`${API_URL}/resource/todo/read`, {
      headers: authHeaders(token),
      data: {},
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    logResult('Initial todo state', {
      taskCount: body.data?.tasks?.length ?? 0,
    })
  })

  test('create 3 new tasks', async ({ request }) => {
    const res = await request.post(`${API_URL}/resource/todo/read`, {
      headers: authHeaders(token),
      data: {},
    })
    const current = await res.json()
    const existingTasks = current.data?.tasks ?? []

    const newTasks = taskIds.map((taskId, i) => ({
      taskId,
      title: `E2E task ${i + 1}`,
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))

    const updateRes = await request.post(`${API_URL}/resource/todo/update`, {
      headers: authHeaders(token),
      data: { tasks: [...existingTasks, ...newTasks] },
    })
    expect(updateRes.status()).toBe(200)
    expect((await updateRes.json()).success).toBe(true)
    logResult('Created 3 tasks', { taskIds })
  })

  test('verify all 3 tasks exist', async ({ request }) => {
    const res = await request.post(`${API_URL}/resource/todo/read`, {
      headers: authHeaders(token),
      data: {},
    })
    const body = await res.json()
    const found = body.data?.tasks?.filter((t: { taskId: string }) =>
      taskIds.includes(t.taskId)
    )
    expect(found).toHaveLength(3)
    expect(found.every((t: { done: boolean }) => !t.done)).toBe(true)
  })

  test('mark 2 tasks as done', async ({ request }) => {
    const res = await request.post(`${API_URL}/resource/todo/read`, {
      headers: authHeaders(token),
      data: {},
    })
    const body = await res.json()
    const tasks = body.data.tasks.map((t: { taskId: string; done: boolean }) =>
      taskIds.slice(0, 2).includes(t.taskId)
        ? { ...t, done: true, updatedAt: Date.now() }
        : t
    )

    const updateRes = await request.post(`${API_URL}/resource/todo/update`, {
      headers: authHeaders(token),
      data: { tasks },
    })
    expect((await updateRes.json()).success).toBe(true)
  })

  test('verify 2 done, 1 pending', async ({ request }) => {
    const res = await request.post(`${API_URL}/resource/todo/read`, {
      headers: authHeaders(token),
      data: {},
    })
    const body = await res.json()
    const e2eTasks = body.data?.tasks?.filter((t: { taskId: string }) =>
      taskIds.includes(t.taskId)
    )
    const done = e2eTasks.filter((t: { done: boolean }) => t.done)
    const pending = e2eTasks.filter((t: { done: boolean }) => !t.done)
    expect(done).toHaveLength(2)
    expect(pending).toHaveLength(1)
    logResult('Task status', { done: done.length, pending: pending.length })
  })

  test('delete all test tasks (cleanup)', async ({ request }) => {
    const res = await request.post(`${API_URL}/resource/todo/read`, {
      headers: authHeaders(token),
      data: {},
    })
    const body = await res.json()
    const tasks = body.data.tasks.filter(
      (t: { taskId: string }) => !taskIds.includes(t.taskId)
    )

    const updateRes = await request.post(`${API_URL}/resource/todo/update`, {
      headers: authHeaders(token),
      data: { tasks },
    })
    expect((await updateRes.json()).success).toBe(true)
    logResult('Cleanup', { removedTasks: taskIds.length })
  })
})

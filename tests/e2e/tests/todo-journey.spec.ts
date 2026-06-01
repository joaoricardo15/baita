/**
 * To-Do Journey E2E Tests
 *
 * User Journey: To-Do Management
 * Tests the full to-do lifecycle that users perform daily:
 * - Create tasks
 * - Mark tasks as complete
 * - Verify task persistence across reads
 * - Clean up (restore original state)
 */
import { expect, test } from '@playwright/test'

import { API_URL, authHeaders, loadAuthData } from './helpers'

let token: string
let userId: string

test.beforeAll(() => {
  const data = loadAuthData()
  token = data.accessToken
  userId = data.userId
})

test.describe('To-Do Lifecycle', () => {
  const taskId = `e2e-task-${Date.now()}`
  const taskTitle = 'E2E test task'

  test.afterAll(async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/todo/read`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    if (
      body.data?.tasks?.some((t: { taskId: string }) => t.taskId === taskId)
    ) {
      const tasks = body.data.tasks.filter(
        (t: { taskId: string }) => t.taskId !== taskId
      )
      await request.post(`${API_URL}/user/${userId}/resource/todo/update`, {
        headers: authHeaders(token),
        data: { tasks },
      })
    }
  })

  test('read current todo state', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/todo/read`,
      { headers: authHeaders(token), data: {} }
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('create a new task via update', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/todo/read`,
      { headers: authHeaders(token), data: {} }
    )
    const current = await res.json()
    const existingTasks = current.data?.tasks ?? []

    const newTask = {
      taskId,
      title: taskTitle,
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const updateRes = await request.post(
      `${API_URL}/user/${userId}/resource/todo/update`,
      {
        headers: authHeaders(token),
        data: { tasks: [...existingTasks, newTask] },
      }
    )
    expect(updateRes.status()).toBe(200)
    expect((await updateRes.json()).success).toBe(true)
  })

  test('verify task appears in todo list', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/todo/read`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    const found = body.data?.tasks?.find(
      (t: { taskId: string }) => t.taskId === taskId
    )
    expect(found).toBeTruthy()
    expect(found.title).toBe(taskTitle)
    expect(found.done).toBe(false)
  })

  test('mark task as complete', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/todo/read`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    const tasks = body.data.tasks.map((t: { taskId: string; done: boolean }) =>
      t.taskId === taskId ? { ...t, done: true, updatedAt: Date.now() } : t
    )

    const updateRes = await request.post(
      `${API_URL}/user/${userId}/resource/todo/update`,
      { headers: authHeaders(token), data: { tasks } }
    )
    expect((await updateRes.json()).success).toBe(true)
  })

  test('verify task is marked complete', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/todo/read`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    const found = body.data?.tasks?.find(
      (t: { taskId: string }) => t.taskId === taskId
    )
    expect(found.done).toBe(true)
  })

  test('remove test task (cleanup)', async ({ request }) => {
    const res = await request.post(
      `${API_URL}/user/${userId}/resource/todo/read`,
      { headers: authHeaders(token), data: {} }
    )
    const body = await res.json()
    const tasks = body.data.tasks.filter(
      (t: { taskId: string }) => t.taskId !== taskId
    )

    const updateRes = await request.post(
      `${API_URL}/user/${userId}/resource/todo/update`,
      { headers: authHeaders(token), data: { tasks } }
    )
    expect((await updateRes.json()).success).toBe(true)
  })
})

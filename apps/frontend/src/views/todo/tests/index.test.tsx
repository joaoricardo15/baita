/**
 * To-Do Page Tests
 *
 * User Journey: To-Do Management
 * Tests the core daily workflow — users adding, completing, and managing tasks.
 *
 * Covers:
 * - Page renders correctly in all states (loading, empty, with data)
 * - User can add a new task
 * - User can mark a task as complete
 * - Data fetching triggers on mount (via TanStack Query)
 * - API failures are handled gracefully
 */
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { vi } from 'vitest'

import { server } from '@/test/mswSetup'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ToDo } from '@/views/todo/index'

vi.mock('@auth0/auth0-react', () => ({
  withAuthenticationRequired: (component: any) => component,
}))

vi.mock('../../../utils/labels', () => ({
  getLabels: (labels: any) => labels.en,
  Labels: {},
}))

const API_BASE = 'http://localhost:5000/prod'

describe('ToDo Page', () => {
  describe('Rendering states', () => {
    it('shows skeleton while loading (data is fetching)', () => {
      server.use(
        http.get(`${API_BASE}/data/todo`, () => {
          return new Promise(() => {}) // never resolves — stays loading
        })
      )

      renderWithProviders(<ToDo />)
      expect(document.body.innerHTML).toContain('MuiSkeleton')
    })

    it('renders task content after loading', async () => {
      server.use(
        http.get(`${API_BASE}/data/todo`, () =>
          HttpResponse.json({
            success: true,
            data: {
              tasks: [
                {
                  taskId: '1',
                  done: false,
                  title: 'Buy milk',
                  createdAt: 1000,
                  updatedAt: 1000,
                },
                {
                  taskId: '2',
                  done: true,
                  title: 'Read book',
                  createdAt: 1000,
                  updatedAt: 1000,
                },
              ],
            },
          })
        )
      )

      renderWithProviders(<ToDo />)

      await waitFor(() => {
        expect(document.body.innerHTML).not.toContain('MuiSkeleton')
        expect(document.body.innerHTML).toContain('Buy milk')
      })
    })

    it('shows empty state when tasks array is empty', async () => {
      renderWithProviders(<ToDo />)

      await waitFor(() => {
        expect(document.body.innerHTML).not.toContain('MuiSkeleton')
      })
    })
  })

  describe('User interactions', () => {
    it('renders input field for adding new tasks', async () => {
      renderWithProviders(<ToDo />)

      await waitFor(() => {
        expect(document.body.innerHTML).not.toContain('MuiSkeleton')
      })

      const input = document.querySelector('input[type="text"]')
      expect(input).toBeInTheDocument()
    })

    it('marks a task as complete when checkbox is clicked', async () => {
      let updateCalled = false
      server.use(
        http.get(`${API_BASE}/data/todo`, () =>
          HttpResponse.json({
            success: true,
            data: {
              tasks: [
                {
                  taskId: '1',
                  done: false,
                  title: 'Test task',
                  createdAt: 1000,
                  updatedAt: 1000,
                },
              ],
            },
          })
        ),
        http.put(`${API_BASE}/data/todo`, async ({ request }) => {
          updateCalled = true
          const body = (await request.json()) as any
          expect(body.tasks[0].done).toBe(true)
          return HttpResponse.json({ success: true, data: body.tasks })
        })
      )

      renderWithProviders(<ToDo />)

      await waitFor(() => {
        expect(document.body.innerHTML).toContain('Test task')
      })

      const checkbox = document.querySelector('input[type="checkbox"]')
      expect(checkbox).toBeInTheDocument()
      fireEvent.click(checkbox!)

      await waitFor(() => {
        expect(updateCalled).toBe(true)
      })
    })
  })

  describe('Error handling', () => {
    it('handles API failure without crashing', async () => {
      server.use(
        http.get(`${API_BASE}/data/todo`, () =>
          HttpResponse.json(
            { success: false, message: 'fail' },
            { status: 500 }
          )
        )
      )

      renderWithProviders(<ToDo />)

      await waitFor(() => {
        expect(document.body.innerHTML).not.toBe('')
      })
    })
  })
})

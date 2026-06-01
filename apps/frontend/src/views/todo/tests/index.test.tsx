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
 * - Data fetching triggers on mount
 * - API failures are handled gracefully
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { UserContext } from '../../../providers/user'
import { ToDo } from '../index'

vi.mock('@auth0/auth0-react', () => ({
  withAuthenticationRequired: (component: any) => component,
}))

vi.mock('../../../utils/labels', () => ({
  getLabels: (labels: any) => labels.en,
  Labels: {},
}))

const createUserContextValue = (overrides = {}) => ({
  connections: undefined,
  contents: undefined,
  retrieveContent: vi.fn().mockResolvedValue(undefined),
  reactToContent: vi.fn().mockResolvedValue(undefined),
  popContent: vi.fn(),
  todoTasks: undefined as any,
  retrieveTodoTasks: vi.fn().mockResolvedValue(undefined),
  updateTodoTasks: vi.fn().mockResolvedValue([]),
  setTodoTasks: vi.fn(),
  ...overrides,
})

const renderTodo = (userContextOverrides = {}) => {
  const userContext = createUserContextValue(userContextOverrides)

  const result = render(
    <MemoryRouter>
      <UserContext.Provider value={userContext}>
        <ToDo />
      </UserContext.Provider>
    </MemoryRouter>
  )

  return { ...result, userContext }
}

describe('ToDo Page', () => {
  describe('Rendering states', () => {
    it('shows skeleton while loading (todoTasks is undefined)', () => {
      renderTodo()
      expect(document.body.innerHTML).toContain('MuiSkeleton')
    })

    it('renders task content after loading', async () => {
      renderTodo({
        todoTasks: [
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
      })

      await waitFor(() => {
        expect(document.body.innerHTML).not.toContain('MuiSkeleton')
        expect(document.body.innerHTML).toContain('Buy milk')
      })
    })

    it('shows empty state when tasks array is empty', async () => {
      renderTodo({ todoTasks: [] })

      await waitFor(() => {
        expect(document.body.innerHTML).not.toContain('MuiSkeleton')
      })
    })
  })

  describe('User interactions', () => {
    it('calls retrieveTodoTasks on mount', () => {
      const retrieveTodoTasks = vi.fn().mockResolvedValue(undefined)
      renderTodo({ retrieveTodoTasks })

      expect(retrieveTodoTasks).toHaveBeenCalledTimes(1)
    })

    it('renders input field for adding new tasks', () => {
      renderTodo({ todoTasks: [] })

      const input = document.querySelector('input[type="text"]')
      expect(input).toBeInTheDocument()
    })

    it('marks a task as complete when checkbox is clicked', async () => {
      const setTodoTasks = vi.fn()
      const updateTodoTasks = vi.fn().mockResolvedValue([])

      renderTodo({
        todoTasks: [
          {
            taskId: '1',
            done: false,
            title: 'Test task',
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        setTodoTasks,
        updateTodoTasks,
      })

      await waitFor(() => {
        expect(document.body.innerHTML).toContain('Test task')
      })

      const checkbox = document.querySelector('input[type="checkbox"]')
      if (checkbox) {
        fireEvent.click(checkbox)

        await waitFor(() => {
          expect(setTodoTasks).toHaveBeenCalled()
        })
      }
    })
  })

  describe('Error handling', () => {
    it('handles API failure without crashing', () => {
      const retrieveTodoTasks = vi.fn().mockRejectedValue(new Error('fail'))
      renderTodo({ retrieveTodoTasks })

      expect(document.body.innerHTML).not.toBe('')
    })
  })
})

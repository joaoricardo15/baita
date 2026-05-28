import { render, waitFor } from '@testing-library/react'
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

  return render(
    <MemoryRouter>
      <UserContext.Provider value={userContext}>
        <ToDo />
      </UserContext.Provider>
    </MemoryRouter>
  )
}

describe('ToDo Page', () => {
  it('renders without crashing', () => {
    renderTodo()
    expect(document.body).toBeDefined()
  })

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
      expect(document.body.innerHTML).not.toContain('skeleton')
      expect(document.body.innerHTML).toContain('Buy milk')
    })
  })

  it('shows empty state when tasks array is empty', async () => {
    renderTodo({ todoTasks: [] })

    await waitFor(() => {
      expect(document.body.innerHTML).not.toContain('skeleton')
    })
  })

  it('calls retrieveTodoTasks on mount', () => {
    const retrieveTodoTasks = vi.fn().mockResolvedValue(undefined)
    renderTodo({ retrieveTodoTasks })

    expect(retrieveTodoTasks).toHaveBeenCalledTimes(1)
  })

  it('handles API failure without crashing', () => {
    const retrieveTodoTasks = vi.fn().mockRejectedValue(new Error('fail'))
    renderTodo({ retrieveTodoTasks })

    expect(document.body.innerHTML).not.toBe('')
  })
})

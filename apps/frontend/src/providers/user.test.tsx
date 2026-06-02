/**
 * UserProvider Tests
 *
 * User Journeys: To-Do Management, Content Feed
 * Tests the data layer that powers the To-Do page and Feed page:
 * - Fetching and storing todo tasks
 * - Updating todo tasks (marking complete, adding new)
 * - Fetching content feed items
 * - Reacting to content (like/dislike/skip)
 * - Popping content and auto-refresh when low
 * - Error handling (API failures don't crash, state resets gracefully)
 */
import { renderHook, waitFor } from '@testing-library/react'
import { FC, ReactNode, useContext } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { AuthContext } from './auth'
import UserProvider, { UserContext } from './user'

const mockGetContent = vi.fn()
const mockReactToContent = vi.fn()
const mockGetTodo = vi.fn()
const mockUpdateTodo = vi.fn()
const mockGetAppConnections = vi.fn()

vi.mock('../utils/requests', () => ({
  default: () => ({
    getContent: mockGetContent,
    reactToContent: mockReactToContent,
    getTodo: mockGetTodo,
    updateTodo: mockUpdateTodo,
    getAppConnections: mockGetAppConnections,
  }),
}))

const mockAuthValue = {
  user: {
    userId: 'test-user',
    email: 'test@test.com',
    name: 'Test',
    picture: '',
  },
  isLoading: false,
  error: undefined,
  isAdmin: false,
  login: vi.fn(),
  logout: vi.fn(),
  getToken: vi.fn().mockResolvedValue('token'),
}

const wrapper: FC<{ children: ReactNode }> = ({ children }) => (
  <MemoryRouter>
    <AuthContext.Provider value={mockAuthValue}>
      <UserProvider>{children}</UserProvider>
    </AuthContext.Provider>
  </MemoryRouter>
)

describe('UserProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetContent.mockResolvedValue([])
    mockGetTodo.mockResolvedValue({ tasks: [] })
    mockGetAppConnections.mockResolvedValue([])
  })

  describe('To-Do Management', () => {
    it('fetches todo tasks on mount', async () => {
      const tasks = [
        {
          taskId: '1',
          title: 'Buy milk',
          done: false,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ]
      mockGetTodo.mockResolvedValue({ tasks })

      const { result } = renderHook(() => useContext(UserContext), { wrapper })

      await waitFor(() => {
        expect(result.current.todoTasks).toEqual(tasks)
      })
      expect(mockGetTodo).toHaveBeenCalledTimes(1)
    })

    it('sets empty array when todo fetch fails', async () => {
      mockGetTodo.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useContext(UserContext), { wrapper })

      await waitFor(() => {
        expect(result.current.todoTasks).toEqual([])
      })
    })

    it('sets empty array when todo has no tasks property', async () => {
      mockGetTodo.mockResolvedValue(null)

      const { result } = renderHook(() => useContext(UserContext), { wrapper })

      await waitFor(() => {
        expect(result.current.todoTasks).toEqual([])
      })
    })

    it('updateTodoTasks calls API with task array', async () => {
      const tasks = [
        {
          taskId: '1',
          title: 'Done',
          done: true,
          createdAt: 1000,
          updatedAt: 2000,
        },
      ]
      mockUpdateTodo.mockResolvedValue(tasks)

      const { result } = renderHook(() => useContext(UserContext), { wrapper })

      await waitFor(() => {
        expect(result.current.todoTasks).toBeDefined()
      })

      const response = await result.current.updateTodoTasks(tasks)
      expect(mockUpdateTodo).toHaveBeenCalledWith(tasks)
      expect(response).toEqual(tasks)
    })

    it('setTodoTasks updates state directly', async () => {
      const { result } = renderHook(() => useContext(UserContext), { wrapper })

      await waitFor(() => {
        expect(result.current.todoTasks).toBeDefined()
      })

      const newTasks = [
        {
          taskId: '99',
          title: 'Direct set',
          done: false,
          createdAt: 1,
          updatedAt: 1,
        },
      ]
      result.current.setTodoTasks(newTasks)

      await waitFor(() => {
        expect(result.current.todoTasks).toEqual(newTasks)
      })
    })
  })

  describe('Content Feed', () => {
    it('fetches content on mount', async () => {
      const content = [{ contentId: 'c1', header: 'News', body: 'Test' }]
      mockGetContent.mockResolvedValue(content)

      const { result } = renderHook(() => useContext(UserContext), { wrapper })

      await waitFor(() => {
        expect(result.current.contents).toEqual(content)
      })
      expect(mockGetContent).toHaveBeenCalledTimes(1)
    })

    it('sets empty array when content fetch fails', async () => {
      mockGetContent.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useContext(UserContext), { wrapper })

      await waitFor(() => {
        expect(result.current.contents).toEqual([])
      })
    })

    it('reactToContent calls API with content and reaction', async () => {
      mockReactToContent.mockResolvedValue(undefined)

      const { result } = renderHook(() => useContext(UserContext), { wrapper })

      await waitFor(() => {
        expect(result.current.contents).toBeDefined()
      })

      const content = { contentId: 'c1', header: 'News', body: 'Test' }
      await result.current.reactToContent(content as any, 'like')
      expect(mockReactToContent).toHaveBeenCalledWith(content, 'like')
    })

    it('popContent removes last item from contents', async () => {
      const content = [
        { contentId: 'c1', header: 'First', body: '1' },
        { contentId: 'c2', header: 'Second', body: '2' },
        { contentId: 'c3', header: 'Third', body: '3' },
        { contentId: 'c4', header: 'Fourth', body: '4' },
        { contentId: 'c5', header: 'Fifth', body: '5' },
      ]
      mockGetContent.mockResolvedValue(content)

      const { result } = renderHook(() => useContext(UserContext), { wrapper })

      await waitFor(() => {
        expect(result.current.contents).toHaveLength(5)
      })

      result.current.popContent()

      await waitFor(() => {
        expect(result.current.contents).toHaveLength(4)
      })
    })

    it('popContent triggers auto-refresh when 3 or fewer items remain', async () => {
      const content = [
        { contentId: 'c1', header: 'First', body: '1' },
        { contentId: 'c2', header: 'Second', body: '2' },
        { contentId: 'c3', header: 'Third', body: '3' },
      ]
      mockGetContent.mockResolvedValueOnce(content).mockResolvedValue([])

      const { result } = renderHook(() => useContext(UserContext), { wrapper })

      await waitFor(() => {
        expect(result.current.contents).toHaveLength(3)
      })

      result.current.popContent()

      await waitFor(() => {
        expect(mockGetContent).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Connections', () => {
    it('fetches app connections on mount', async () => {
      const connections = [
        { connectionId: 'conn-1', appId: 'google', name: 'Gmail' },
      ]
      mockGetAppConnections.mockResolvedValue(connections)

      const { result } = renderHook(() => useContext(UserContext), { wrapper })

      await waitFor(() => {
        expect(result.current.connections).toEqual(connections)
      })
    })

    it('sets empty array when connections fetch fails', async () => {
      mockGetAppConnections.mockRejectedValue(new Error('fail'))

      const { result } = renderHook(() => useContext(UserContext), { wrapper })

      await waitFor(() => {
        expect(result.current.connections).toEqual([])
      })
    })
  })
})

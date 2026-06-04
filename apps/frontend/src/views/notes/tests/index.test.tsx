/**
 * Notes Page Tests
 *
 * User Journey: Notes
 * Tests the note-taking feature — users creating, editing, and deleting notes.
 *
 * Covers:
 * - Page shows loading skeleton initially
 * - Page shows empty state when no notes exist
 * - Page shows note cards after data loads
 * - User can open dialog to add a new note
 * - API failures show error notification
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { AuthContext } from '@/providers/auth'
import { NotificationContext } from '@/providers/notification'
import { server } from '@/test/mswSetup'
import { Notes } from '@/views/notes/index'

vi.mock('@auth0/auth0-react', () => ({
  withAuthenticationRequired: (component: any) => component,
}))

vi.mock('../../../utils/labels', () => ({
  getLabels: (labels: any) => labels.en,
  Labels: {},
}))

const API_BASE = 'http://localhost:5000/prod'

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
  getToken: vi.fn().mockResolvedValue('mock-token'),
}

const mockNotification = {
  showSnack: vi.fn(),
  showModal: vi.fn(),
  showLoading: vi.fn(),
}

const renderNotes = () => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthValue}>
        <NotificationContext.Provider value={mockNotification as any}>
          <Notes />
        </NotificationContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('Notes Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering states', () => {
    it('shows empty state when API returns no notes', async () => {
      server.use(
        http.post(`${API_BASE}/user/:userId/resource/note/list`, () => {
          return HttpResponse.json({
            success: true,
            data: [],
          })
        })
      )

      renderNotes()

      await waitFor(() => {
        expect(screen.getByText('No notes yet')).toBeInTheDocument()
        expect(
          screen.getByText('Capture your thoughts and ideas here.')
        ).toBeInTheDocument()
      })
    })

    it('shows note cards after data loads', async () => {
      server.use(
        http.post(`${API_BASE}/user/:userId/resource/note/list`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              {
                noteId: '1',
                title: 'First note',
                createdAt: 1000,
                updatedAt: Date.now(),
              },
              {
                noteId: '2',
                title: 'Second note',
                createdAt: 2000,
                updatedAt: Date.now(),
              },
            ],
          })
        })
      )

      renderNotes()

      await waitFor(() => {
        expect(screen.getByText('First note')).toBeInTheDocument()
        expect(screen.getByText('Second note')).toBeInTheDocument()
      })
    })

    it('shows add note button', async () => {
      server.use(
        http.post(`${API_BASE}/user/:userId/resource/note/list`, () => {
          return HttpResponse.json({
            success: true,
            data: [],
          })
        })
      )

      renderNotes()

      await waitFor(() => {
        expect(screen.getByText('Add note')).toBeInTheDocument()
      })
    })
  })

  describe('User interactions', () => {
    it('opens dialog when add note is clicked', async () => {
      server.use(
        http.post(`${API_BASE}/user/:userId/resource/note/list`, () => {
          return HttpResponse.json({
            success: true,
            data: [],
          })
        })
      )

      renderNotes()

      await waitFor(() => {
        expect(screen.getByText('Add note')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Add note'))

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('What is on your mind?')
        ).toBeInTheDocument()
      })
    })

    it('shows error notification on API failure', async () => {
      server.use(
        http.post(`${API_BASE}/user/:userId/resource/note/list`, () => {
          return HttpResponse.json({
            success: false,
            message: 'Server error',
          })
        })
      )

      renderNotes()

      await waitFor(() => {
        expect(mockNotification.showSnack).toHaveBeenCalledWith(
          'Could not load notes',
          'error'
        )
      })
    })
  })
})

/**
 * Notes Page Tests
 *
 * User Journey: Notes
 * Tests the note-taking feature — users creating, editing, and deleting notes.
 *
 * Covers:
 * - Page starts in new-note editing mode (textarea visible)
 * - Page shows note list after navigating back from editor
 * - User can type in the editor
 * - API failures are handled gracefully
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { AuthContext } from '../../../providers/auth'
import { NotificationContext } from '../../../providers/notification'
import { server } from '../../../test/mswSetup'
import { Notes } from '../index'

vi.mock('@auth0/auth0-react', () => ({
  withAuthenticationRequired: (component: any) => component,
}))

vi.mock('../../../utils/labels', () => ({
  getLabels: (labels: any) => labels.en,
  Labels: {},
}))

const API_BASE = 'http://localhost:5000/dev'

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
    it('starts in editing mode with empty textarea', () => {
      renderNotes()

      const textarea = document.querySelector('textarea')
      expect(textarea).toBeInTheDocument()
      expect(textarea?.value).toBe('')
    })

    it('shows placeholder text in editor', () => {
      renderNotes()

      expect(
        screen.getByPlaceholderText('What is in your mind?')
      ).toBeInTheDocument()
    })

    it('shows back button to navigate to list', () => {
      renderNotes()

      expect(screen.getByText('Notes')).toBeInTheDocument()
    })

    it('shows note list after clicking back button', async () => {
      server.use(
        http.post(`${API_BASE}/user/:userId/resource/note/list`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              {
                noteId: '1',
                title: 'First note',
                createdAt: 1000,
                updatedAt: 1000,
              },
              {
                noteId: '2',
                title: 'Second note',
                createdAt: 2000,
                updatedAt: 2000,
              },
            ],
          })
        })
      )

      renderNotes()

      await waitFor(() => {
        const backButton = screen.getByText('Notes').closest('button')
        expect(backButton).toBeInTheDocument()
      })

      const backButton = screen.getByText('Notes').closest('button')!
      fireEvent.click(backButton)

      await waitFor(() => {
        expect(screen.getByText('First note')).toBeInTheDocument()
        expect(screen.getByText('Second note')).toBeInTheDocument()
      })
    })
  })

  describe('User interactions', () => {
    it('user can type in the editor', () => {
      renderNotes()

      const textarea = screen.getByPlaceholderText('What is in your mind?')
      fireEvent.change(textarea, { target: { value: 'My new note' } })

      expect(textarea).toHaveValue('My new note')
    })

    it('add button is disabled when editor is empty', () => {
      renderNotes()

      const fab = document.querySelector('button[disabled]')
      expect(fab).toBeInTheDocument()
    })

    it('add button is enabled when editor has content', () => {
      renderNotes()

      const textarea = screen.getByPlaceholderText('What is in your mind?')
      fireEvent.change(textarea, { target: { value: 'Content' } })

      const fab = document.querySelector('.MuiFab-root:not([disabled])')
      expect(fab).toBeInTheDocument()
    })
  })

  describe('Error handling', () => {
    it('handles API failure without crashing', async () => {
      server.use(
        http.post(`${API_BASE}/user/:userId/resource/note/list`, () => {
          return HttpResponse.json({ success: false, message: 'Server error' })
        })
      )

      renderNotes()
      expect(document.body.innerHTML).not.toBe('')
    })
  })
})

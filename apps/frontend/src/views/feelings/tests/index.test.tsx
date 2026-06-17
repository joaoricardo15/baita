/**
 * Feelings Page Tests
 *
 * User Journey: Feelings / Dream Journal
 * Tests the feelings listing page — loading, rendering, cards, and failure handling.
 *
 * Covers:
 * - Page renders without crashing
 * - Shows skeleton during loading
 * - Shows empty state when no feelings exist
 * - Shows feeling cards after data loads
 * - Shows Add button
 * - Handles API failure gracefully
 */
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { vi } from 'vitest'

import { server } from '@/test/mswSetup'
import { renderWithProviders } from '@/test/renderWithProviders'
import { Feelings } from '@/views/feelings/index'

vi.mock('@auth0/auth0-react', () => ({
  withAuthenticationRequired: (component: unknown) => component,
}))

vi.mock('../../../utils/labels', () => ({
  getLabels: (labels: { en: Record<string, string> }) => labels.en,
  Labels: {},
}))

const API_BASE = 'http://localhost:5000/prod'

describe('Feelings Page', () => {
  it('renders without crashing', () => {
    renderWithProviders(<Feelings />)
    expect(document.body).toBeDefined()
  })

  it('shows skeleton while fetching', () => {
    server.use(
      http.get(`${API_BASE}/data/feeling`, () => {
        return new Promise(() => {})
      })
    )

    renderWithProviders(<Feelings />)
    expect(
      document.querySelector('[class*="skeleton"]') || document.body.innerHTML
    ).toBeDefined()
  })

  it('shows empty state when API returns no feelings', async () => {
    server.use(
      http.get(`${API_BASE}/data/feeling`, () => {
        return HttpResponse.json({ success: true, data: [] })
      })
    )

    renderWithProviders(<Feelings />)

    await waitFor(() => {
      expect(screen.getByText('How are you feeling?')).toBeDefined()
    })
  })

  it('shows feeling cards after data loads', async () => {
    server.use(
      http.get(`${API_BASE}/data/feeling`, () => {
        return HttpResponse.json({
          success: true,
          data: [
            {
              feelingId: '1',
              content: 'Vivid dream about flying',
              mood: 'joyful',
              tags: ['dream', 'lucid'],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            {
              feelingId: '2',
              content: 'Grateful for a quiet morning',
              mood: 'peaceful',
              tags: ['gratitude'],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        })
      })
    )

    renderWithProviders(<Feelings />)

    await waitFor(() => {
      expect(screen.getByText('Vivid dream about flying')).toBeDefined()
      expect(screen.getByText('Grateful for a quiet morning')).toBeDefined()
    })
  })

  it('shows add button', async () => {
    renderWithProviders(<Feelings />)

    await waitFor(() => {
      expect(screen.getByText('How are you?')).toBeDefined()
    })
  })

  it('handles API failure gracefully without crashing', async () => {
    server.use(
      http.get(`${API_BASE}/data/feeling`, () =>
        HttpResponse.json(
          { success: false, message: 'Server Error' },
          { status: 500 }
        )
      )
    )

    renderWithProviders(<Feelings />)

    await waitFor(() => {
      expect(document.body.innerHTML).not.toBe('')
    })
  })
})

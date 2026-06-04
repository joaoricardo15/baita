import { render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'

import ErrorProvider from '../error'

const mockErrorMessage = 'Test error'

describe('ErrorContext general error', () => {
  const TestComponent = () => {
    throw Error(mockErrorMessage)
  }

  test('Should show the error component', async () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Error!!!')).toBeDefined()
    })
  })
})

describe('ErrorContext type error', () => {
  const TestComponent = () => {
    const testObject = undefined
    const undefinedPropertyName = 'testProperty'

    return (
      <div data-testid="testContent">
        {(testObject as any)[undefinedPropertyName]}
      </div>
    )
  }

  test('Should show the error component', async () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Error!!!')).toBeDefined()
    })
  })
})

describe('ErrorContext hook error', () => {
  const TestComponent = () => {
    useEffect(() => {
      throw Error(mockErrorMessage)
    })

    return <div data-testid="testContent"></div>
  }

  test('Should show the error component', async () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Error!!!')).toBeDefined()
    })
  })
})

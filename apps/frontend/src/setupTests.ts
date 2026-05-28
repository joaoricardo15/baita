import '@testing-library/jest-dom'

import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import { server } from './test/mswSetup'

const fetchMock = createFetchMock(vi)
fetchMock.enableMocks()

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

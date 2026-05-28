import axios, { AxiosInstance } from 'axios'

const API_URL = 'https://api.baita.help'
const SMOKE_TEST_USER_ID = 'smoke-test-ci'

let client: AxiosInstance
let unauthClient: AxiosInstance

export async function getApiClient(): Promise<AxiosInstance> {
  if (client) return client

  const token = process.env.SMOKE_TEST_TOKEN
  if (!token) {
    throw new Error('Missing SMOKE_TEST_TOKEN environment variable')
  }

  client = axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
    validateStatus: () => true,
  })

  return client
}

export function getUnauthClient(): AxiosInstance {
  if (unauthClient) return unauthClient

  unauthClient = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
    validateStatus: () => true,
  })

  return unauthClient
}

export function getUserId(): string {
  return SMOKE_TEST_USER_ID
}

export async function ensureUserExists(): Promise<void> {
  const api = await getApiClient()
  const res = await api.post(
    `/user/${SMOKE_TEST_USER_ID}/resource/todo/list`,
    {}
  )
  if (res.status === 200 && res.data.success) return

  await api.post('/user', {
    user_id: `smoke|${SMOKE_TEST_USER_ID}`,
    userId: SMOKE_TEST_USER_ID,
    name: 'Smoke Test CI',
    email: 'smoke-tests@baita.help',
    picture: '',
  })
}

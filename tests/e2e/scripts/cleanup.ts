import fs from 'fs'
import path from 'path'

const API_URL = process.env.API_URL
const tokenFile = path.join(__dirname, '../playwright/.auth/token.json')

async function cleanup() {
  if (!API_URL) {
    throw new Error('API_URL environment variable is required')
  }

  if (!fs.existsSync(tokenFile)) {
    throw new Error(
      `Token file not found at ${tokenFile} — setup may have failed`
    )
  }

  const data = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'))
  const token = data?.accessToken

  if (!token) {
    throw new Error('Token file exists but accessToken is missing')
  }

  console.log('[cleanup] Deleting E2E test user via DELETE /user ...')

  const res = await fetch(`${API_URL}/user`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    throw new Error(`DELETE /user failed with status ${res.status}`)
  }

  const body = await res.json()
  if (!body.success) {
    throw new Error(`DELETE /user returned success=false: ${body.message}`)
  }

  console.log('[cleanup] User deleted successfully')

  fs.unlinkSync(tokenFile)
  console.log('[cleanup] Token file removed')
}

cleanup().catch((err) => {
  console.error(`[cleanup] FAILED: ${err.message}`)
  process.exit(1)
})

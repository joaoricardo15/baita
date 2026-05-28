import axios from 'axios'
import qs from 'qs'

const SERVICE_API_URL = process.env.SERVICE_API_URL || ''
const GOOGLE_AUTH_URL = process.env.GOOGLE_AUTH_URL || ''
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

class Google {
  async getCredentials(code: string): Promise<{ access_token: string }> {
    try {
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      }

      const data = qs.stringify({
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${SERVICE_API_URL}/connectors/google`,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        access_type: 'offline',
      })

      const credentialsResult = await axios({
        method: 'post',
        url: GOOGLE_AUTH_URL,
        headers,
        data,
      })

      if (credentialsResult.status !== 200) throw credentialsResult.data

      return credentialsResult.data
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown } }
      throw axiosErr?.response?.data || err
    }
  }

  async getConnectionInfo(
    accessToken: string
  ): Promise<{ connectionId: string; email: string }> {
    try {
      const tokenResult = await axios({
        method: 'get',
        url: `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`,
      })

      if (tokenResult.status !== 200) throw tokenResult.data

      const { id, email } = tokenResult.data

      return { connectionId: id.toString(), email }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown } }
      throw axiosErr?.response?.data || err
    }
  }

  deconstructAuthState(state: string): {
    appId: string
    userId: string
    botId: string
    taskIndex: number
  } {
    const parts = state.split(':')

    return {
      appId: parts[0],
      userId: parts[1],
      botId: parts[2],
      taskIndex: Number(parts[3]),
    }
  }
}

export default Google

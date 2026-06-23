import {
  generateId,
  getConnectorByAppId,
  getConnectorById,
} from '@baita/shared'
import axios from 'axios'
import qs from 'qs'

import Bot from '@/controllers/bot'
import { ITokenCredentials, refreshOAuth2Token } from '@/utils/tokenRefresh'

import Data from './data'

const SERVICE_API_URL = process.env.SERVICE_API_URL || ''

class Connection {
  private store(userId: string) {
    return new Data(userId, 'connection')
  }

  private redact(connection: Record<string, unknown>) {
    const { credentials: _creds, ...safe } = connection
    return safe
  }

  private async getLinkedBots(userId: string, connectionId: string) {
    const botStore = new Data(userId, 'bot')
    const bots = (await botStore.list()) || []

    return bots.filter((bot: Record<string, unknown>) => {
      const tasks = bot.tasks as Array<{ connectionId?: string }>
      return tasks?.some((task) => task.connectionId === connectionId)
    })
  }

  async listConnections(userId: string) {
    const connections = (await this.store(userId).list()) || []
    return connections.map((c: Record<string, unknown>) => this.redact(c))
  }

  async createConnection(userId: string, connectorId: string, apiKey: string) {
    if (!connectorId || !apiKey) {
      throw new Error('Missing required fields: connectorId, apiKey')
    }

    const connector = getConnectorById(connectorId)
    if (!connector || connector.auth.type !== 'userApiKey') {
      throw new Error('Invalid connector or auth type')
    }

    const connectionId = generateId()
    const connection = {
      userId,
      appId: connector.appId,
      connectionId,
      connectorId,
      credentials: { apiKey },
      name: connector.name,
      email: '',
      createdAt: new Date().toISOString(),
    }

    await this.store(userId).create(connectionId, connection)
    return this.redact(connection)
  }

  async getConnectionDetails(userId: string, connectionId: string) {
    const connection = await this.store(userId).read(connectionId)
    if (!connection) throw new Error('Connection not found')

    const linkedBots = (await this.getLinkedBots(userId, connectionId)).map(
      (bot: Record<string, unknown>) => ({
        botId: bot.botId,
        name: bot.name,
      })
    )

    return { connection: this.redact(connection), linkedBots }
  }

  async deleteConnection(userId: string, connectionId: string) {
    const store = this.store(userId)
    const connection = await store.read(connectionId)
    if (!connection) throw new Error('Connection not found')

    const linkedBots = await this.getLinkedBots(userId, connectionId)
    const botStore = new Data(userId, 'bot')
    for (const bot of linkedBots) {
      const tasks = bot.tasks as Array<{ connectionId?: string }>
      const cleaned = tasks.map((t) =>
        t.connectionId === connectionId ? { ...t, connectionId: undefined } : t
      )
      await botStore.update(bot.botId as string, { tasks: cleaned })
    }

    await store.delete(connectionId)
  }

  async checkHealth(userId: string, connectionId: string) {
    const store = this.store(userId)
    const connection = await store.read(connectionId)
    if (!connection) throw new Error('Connection not found')

    const connector =
      (connection.connectorId &&
        getConnectorById(connection.connectorId as string)) ||
      getConnectorByAppId(connection.appId as string)

    if (!connector || !connector.healthCheck) {
      return { status: 'unknown', message: 'No health check configured' }
    }

    const healthUrl = this.resolveUrl(
      connector.healthCheck.url,
      connector.base.url
    )
    const credentials = connection.credentials as ITokenCredentials
    const authHeader =
      connector.auth.type === 'userApiKey'
        ? `${connector.auth.prefix || ''}${credentials.apiKey || ''}`
        : `Bearer ${credentials.access_token}`

    try {
      await axios.request({
        url: healthUrl,
        method: connector.healthCheck.method || 'GET',
        headers: { Authorization: authHeader },
      })
      return { status: 'healthy' }
    } catch (healthErr: unknown) {
      const status =
        healthErr && typeof healthErr === 'object' && 'response' in healthErr
          ? (healthErr as { response?: { status?: number } }).response?.status
          : undefined

      if (status === 401 && connector.auth.type === 'oauth2') {
        try {
          const newCredentials = await refreshOAuth2Token(
            connector,
            credentials,
            `${SERVICE_API_URL}/oauth/callback`
          )

          const { userId: _u, sortKey: _s, ...rest } = connection
          await store.update(connectionId, {
            ...rest,
            credentials: newCredentials,
          })

          await axios.request({
            url: healthUrl,
            method: connector.healthCheck.method || 'GET',
            headers: {
              Authorization: `Bearer ${newCredentials.access_token}`,
            },
          })
          return { status: 'healthy' }
        } catch (_err: unknown) {
          return {
            status: 'expired',
            message: 'Token refresh failed — reconnection required',
          }
        }
      }

      return { status: 'error', message: 'Health check request failed' }
    }
  }

  async handleOAuthCallback(params: { code: string; state: string }) {
    const { userId, appId, botId, taskIndex, connectorId } =
      this.deconstructState(params.state)

    const connector = getConnectorById(connectorId)
    if (!connector || connector.auth.type !== 'oauth2') {
      throw new Error(`Unknown or non-OAuth connector: ${connectorId}`)
    }

    const { auth } = connector
    const clientId = process.env[auth.clientIdEnvVar] || ''
    const clientSecret = process.env[auth.clientSecretEnvVar] || ''

    const credentials = await this.exchangeCodeForTokens({
      tokenUrl: auth.tokenUrl,
      code: params.code,
      clientId,
      clientSecret,
      redirectUri: `${SERVICE_API_URL}/oauth/callback`,
      tokenAuthMethod: auth.tokenAuthMethod || 'body',
    })

    const { connectionId, email, name } = await this.fetchUserInfo({
      userInfoUrl: auth.userInfoUrl,
      accessToken: credentials.access_token,
      userIdField: auth.userIdField,
      baseUrl: connector.base.url,
    })

    const newConnection = {
      userId,
      appId,
      connectionId,
      connectorId,
      credentials,
      name,
      email,
      createdAt: new Date().toISOString(),
    }

    await this.store(userId).create(connectionId, newConnection)

    if (botId) {
      const bot = new Bot()
      await bot.addConnection(userId, botId, connectionId, taskIndex)
    }
  }

  private resolveUrl(url: string, baseUrl: string) {
    return url.startsWith('http') ? url : `${baseUrl}${url}`
  }

  private deconstructState(state: string) {
    const parts = state.split(':')
    return {
      appId: parts[0],
      userId: parts[1],
      botId: parts[2],
      taskIndex: Number(parts[3]),
      connectorId: parts[4] || '',
    }
  }

  private async exchangeCodeForTokens(params: {
    tokenUrl: string
    code: string
    clientId: string
    clientSecret: string
    redirectUri: string
    tokenAuthMethod: 'basic' | 'body'
  }): Promise<Record<string, string>> {
    const body: Record<string, string> = {
      code: params.code,
      grant_type: 'authorization_code',
      redirect_uri: params.redirectUri,
    }

    if (params.tokenAuthMethod === 'body') {
      body.client_id = params.clientId
      body.client_secret = params.clientSecret
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    }

    if (params.tokenAuthMethod === 'basic') {
      const encoded = Buffer.from(
        `${params.clientId}:${params.clientSecret}`
      ).toString('base64')
      headers['Authorization'] = `Basic ${encoded}`
    }

    const response = await axios.post(params.tokenUrl, qs.stringify(body), {
      headers,
    })
    return response.data
  }

  private async fetchUserInfo(params: {
    userInfoUrl: string
    accessToken: string
    userIdField: string
    baseUrl: string
  }): Promise<{ connectionId: string; email: string; name: string }> {
    const url = this.resolveUrl(params.userInfoUrl, params.baseUrl)

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${params.accessToken}` },
    })

    const data = response.data
    const connectionId = this.getNestedValue(data, params.userIdField)

    const parentPath = params.userIdField.split('.').slice(0, -1).join('.')
    const userObj = parentPath
      ? (this.getNestedValue(data, parentPath) as Record<string, unknown>)
      : data

    const email =
      (userObj?.email as string) ||
      (userObj?.mail as string) ||
      data.email ||
      String(connectionId)

    const name =
      (userObj?.name as string) ||
      (userObj?.email as string) ||
      String(connectionId)

    return { connectionId: String(connectionId), email, name }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key]
      }
      return undefined
    }, obj)
  }
}

export default Connection

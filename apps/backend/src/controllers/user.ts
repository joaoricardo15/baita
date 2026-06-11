import { IContent, IUser } from '@baita/shared'
import axios from 'axios'

import Bot from '@/controllers/bot'
import Data from '@/controllers/data'
import { CONTENT_BATCH_LIMIT, CONTENT_TTL_DAYS } from '@/utils/constants'

const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || ''
const AUTH0_M2M_CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID || ''
const AUTH0_M2M_CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET || ''

class User {
  async createUser(userId: string, user: IUser) {
    const dataStore = new Data(userId, 'user')
    await dataStore.create('', user)
    return user
  }

  async deleteUser(userId: string) {
    const errors: string[] = []

    try {
      const botStore = new Data(userId, 'bot')
      const bots = await botStore.list()

      if (bots && bots.length > 0) {
        const botController = new Bot()
        for (const bot of bots) {
          try {
            await botController.deleteBot(userId, bot.botId as string)
          } catch (err) {
            errors.push(`Bot ${bot.botId}: ${err}`)
          }
        }
      }
    } catch (err) {
      errors.push(`Query bots: ${err}`)
    }

    try {
      const dataStore = new Data(userId, '')
      await dataStore.deleteAllForUser()
    } catch (err) {
      throw new Error(`Failed to delete user data: ${err}`)
    }

    try {
      await this.deleteAuth0User(userId)
    } catch (err) {
      throw new Error(`Failed to delete Auth0 user: ${err}`)
    }

    if (errors.length > 0) {
      console.warn('Non-critical deletion errors:', errors)
    }
  }

  private async deleteAuth0User(userId: string) {
    const tokenResponse = await axios.post(
      new URL('/oauth/token', AUTH0_AUDIENCE).href,
      {
        grant_type: 'client_credentials',
        client_id: AUTH0_M2M_CLIENT_ID,
        client_secret: AUTH0_M2M_CLIENT_SECRET,
        audience: AUTH0_AUDIENCE,
      }
    )

    await axios.delete(`${AUTH0_AUDIENCE}users/auth0|${userId}`, {
      headers: {
        Authorization: `Bearer ${tokenResponse.data.access_token}`,
      },
    })
  }

  async getContent(userId: string) {
    const contentStore = new Data(userId, 'content')
    const allContent = await contentStore.list()

    if (!allContent) return []

    return allContent.filter((item: Record<string, unknown>) => !item.seenAt)
  }

  async reactToContent(userId: string, contentId: string, reaction: string) {
    const contentStore = new Data(userId, 'content')
    await contentStore.update(contentId, {
      seenAt: new Date().toISOString(),
      reaction,
    })
  }

  async publishContent(
    userId: string,
    content: IContent[]
  ): Promise<{ published: number; total: number }> {
    const contentStore = new Data(userId, 'content')
    const existingContent = await contentStore.list()

    const existingIds = new Set(
      (existingContent || []).map((c: Record<string, unknown>) => c.contentId)
    )

    const newContent = content
      .filter(({ contentId }) => !existingIds.has(contentId))
      .slice(0, CONTENT_BATCH_LIMIT)

    const ttl = Math.floor(Date.now() / 1000) + CONTENT_TTL_DAYS * 24 * 60 * 60

    for (const item of newContent) {
      await contentStore.create(item.contentId, {
        ...item,
        publishedAt: new Date().toISOString(),
        ttl,
      })
    }

    return { published: newContent.length, total: content.length }
  }
}

export default User

import { IContent, IUser } from '@baita/shared'
import axios from 'axios'

import Bot from '@/controllers/bot'
import Data from '@/controllers/data'
import { CONTENT_BATCH_LIMIT, CONTENT_TTL_DAYS } from '@/utils/constants'

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || ''
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || ''
const AUTH0_M2M_CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID || ''
const AUTH0_M2M_CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET || ''

class User {
  async createUser(userId: string, user: IUser) {
    try {
      const dataStore = new Data(userId, 'user')
      await dataStore.create('', user)
      return user
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async deleteUser(userId: string) {
    try {
      const botStore = new Data(userId, 'bot')
      const bots = await botStore.list()

      if (bots && bots.length > 0) {
        const botController = new Bot()
        for (const bot of bots) {
          try {
            await botController.deleteBot(
              userId,
              bot.botId as string,
              bot.apiId as string
            )
          } catch (err) {
            console.error(`Failed to delete bot ${bot.botId}:`, err)
          }
        }
      }
    } catch (err) {
      console.error('Failed to query/delete bots:', err)
    }

    try {
      const dataStore = new Data(userId, '')
      await dataStore.deleteAllForUser()
    } catch (err) {
      console.error('Failed to delete DynamoDB records:', err)
    }

    await this.deleteAuth0User(userId)
  }

  private async deleteAuth0User(userId: string) {
    try {
      const tokenResponse = await axios.post(
        `https://${AUTH0_DOMAIN}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: AUTH0_M2M_CLIENT_ID,
          client_secret: AUTH0_M2M_CLIENT_SECRET,
          audience: AUTH0_AUDIENCE,
        }
      )

      await axios.delete(
        `https://${AUTH0_DOMAIN}/api/v2/users/auth0|${userId}`,
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.data.access_token}`,
          },
        }
      )
    } catch (err) {
      console.error('Failed to delete Auth0 user:', err)
    }
  }

  async getContent(userId: string) {
    try {
      const contentStore = new Data(userId, 'content')
      const allContent = await contentStore.list()

      if (!allContent) return []

      return allContent.filter((item: Record<string, unknown>) => !item.seenAt)
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async reactToContent(userId: string, contentId: string, reaction: string) {
    try {
      const contentStore = new Data(userId, 'content')
      await contentStore.update(contentId, {
        seenAt: new Date().toISOString(),
        reaction,
      })
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  async publishContent(
    userId: string,
    content: IContent[]
  ): Promise<{ published: number; total: number }> {
    try {
      const contentStore = new Data(userId, 'content')
      const existingContent = await contentStore.list()

      const existingIds = new Set(
        (existingContent || []).map((c: Record<string, unknown>) => c.contentId)
      )

      const newContent = content
        .filter(({ contentId }) => !existingIds.has(contentId))
        .slice(0, CONTENT_BATCH_LIMIT)

      const ttl =
        Math.floor(Date.now() / 1000) + CONTENT_TTL_DAYS * 24 * 60 * 60

      for (const item of newContent) {
        await contentStore.create(item.contentId, {
          ...item,
          publishedAt: new Date().toISOString(),
          ttl,
        })
      }

      return { published: newContent.length, total: content.length }
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  }
}

export default User

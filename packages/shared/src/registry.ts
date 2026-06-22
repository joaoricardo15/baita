import { z } from 'zod'

import { ActivitySchema } from './models/activity/activity.schema'
import { BotSchema } from './models/bot/bot.schema'
import { BotTemplateSchema } from './models/bot/template/template.schema'
import { ConnectionSchema } from './models/connection/connection.schema'
import { ContentSchema } from './models/content/content.schema'
import { FeelingSchema } from './models/feeling/feeling.schema'
import { GuideSchema } from './models/guide/guide.schema'
import { PlaceSchema } from './models/place/place.schema'
import { TodoSchema } from './models/todo/todo.schema'
import { UserSchema } from './models/user/user.schema'
import { UsualPlaceSchema } from './models/usual-place/usual-place.schema'
import { VisitSchema } from './models/visit/visit.schema'

export interface IEntityTypeConfig {
  schema: z.ZodSchema | null
  idField: string
  singleton: boolean
}

export const entityRegistry: Record<string, IEntityTypeConfig> = {
  user: { schema: UserSchema, idField: '', singleton: true },
  bot: { schema: BotSchema, idField: 'botId', singleton: false },
  template: {
    schema: BotTemplateSchema,
    idField: 'templateId',
    singleton: false,
  },
  connection: {
    schema: ConnectionSchema,
    idField: 'connectionId',
    singleton: false,
  },
  feeling: { schema: FeelingSchema, idField: 'feelingId', singleton: false },
  guide: { schema: GuideSchema, idField: 'guideId', singleton: false },
  place: { schema: PlaceSchema, idField: 'placeId', singleton: false },
  todo: { schema: TodoSchema, idField: '', singleton: true },
  content: { schema: ContentSchema, idField: 'contentId', singleton: false },
  image: { schema: null, idField: '', singleton: false },
  'usual-place': {
    schema: UsualPlaceSchema,
    idField: 'usualPlaceId',
    singleton: false,
  },
  visit: { schema: VisitSchema, idField: 'visitId', singleton: false },
  activity: {
    schema: ActivitySchema,
    idField: 'activityId',
    singleton: false,
  },
}

export type EntityType = keyof typeof entityRegistry

export function getEntityConfig(type: string): IEntityTypeConfig | undefined {
  return entityRegistry[type.toLowerCase()]
}

export function isRegisteredType(type: string): boolean {
  return type.toLowerCase() in entityRegistry
}

export function getRegisteredTypes(): string[] {
  return Object.keys(entityRegistry)
}

import { z } from 'zod'

import { BotSchema } from './schemas/bot'
import { ConnectionSchema } from './schemas/connection'
import { NoteSchema } from './schemas/note'
import { PlaceSchema } from './schemas/place'
import { ContentSchema, TodoSchema, UserSchema } from './schemas/user'

export interface IEntityTypeConfig {
  schema: z.ZodSchema | null
  idField: string
  singleton: boolean
}

export const entityRegistry: Record<string, IEntityTypeConfig> = {
  user: { schema: UserSchema, idField: '', singleton: true },
  bot: { schema: BotSchema, idField: 'botId', singleton: false },
  model: { schema: BotSchema, idField: 'modelId', singleton: false },
  connection: {
    schema: ConnectionSchema,
    idField: 'connectionId',
    singleton: false,
  },
  note: { schema: NoteSchema, idField: 'noteId', singleton: false },
  place: { schema: PlaceSchema, idField: 'placeId', singleton: false },
  todo: { schema: TodoSchema, idField: '', singleton: true },
  content: { schema: ContentSchema, idField: 'contentId', singleton: false },
  image: { schema: null, idField: '', singleton: false },
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

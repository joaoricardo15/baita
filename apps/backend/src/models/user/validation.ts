import Ajv, { JSONSchemaType } from 'ajv'
import addFormats from 'ajv-formats'

import { IContent, ITodoTask, IUser } from './interface'
import userSchema from './schema.json'

const ajv = new Ajv()
addFormats(ajv)

export const userSchemaType = userSchema as JSONSchemaType<IUser>

export const contentSchema: JSONSchemaType<IContent[]> = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      contentId: {
        type: 'string',
      },
      date: {
        type: 'string',
      },
      header: {
        type: 'string',
      },
      body: {
        type: 'string',
        nullable: true,
      },
      source: {
        type: 'string',
        nullable: true,
      },
      image: {
        type: 'string',
        nullable: true,
      },
      url: {
        type: 'string',
        nullable: true,
      },
      likes: {
        type: 'number',
        nullable: true,
      },
      comments: {
        type: 'number',
        nullable: true,
      },
      author: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          accountName: {
            type: 'string',
            nullable: true,
          },
          description: {
            type: 'string',
            nullable: true,
          },
          image: {
            type: 'string',
            nullable: true,
          },
          url: {
            type: 'string',
            nullable: true,
          },
          location: {
            type: 'string',
            nullable: true,
          },
          followers: {
            type: 'number',
            nullable: true,
          },
        },
        required: ['name'],
      },
    },
    required: ['contentId', 'date', 'header', 'author'],
  },
}

export const todoTasksSchema: JSONSchemaType<ITodoTask[]> = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
      },
      title: {
        type: 'string',
      },
      body: {
        type: 'string',
        nullable: true,
      },
      done: {
        type: 'boolean',
      },
      createdAt: {
        type: 'number',
      },
      updatedAt: {
        type: 'number',
      },
    },
    required: ['taskId', 'title', 'done', 'createdAt', 'updatedAt'],
  },
}

export const validateUser = (user: IUser) => {
  const validate = ajv.compile(userSchemaType)

  if (!validate(user)) {
    throw Error(`Invalid User: ${ajv.errorsText(validate.errors)}`)
  }
}

export const validateContent = (content: IContent[]) => {
  const validate = ajv.compile(contentSchema)

  if (!validate(content)) {
    throw Error(`Invalid Content: ${ajv.errorsText(validate.errors)}`)
  }
}

export const validateTodoTasks = (todoTask: ITodoTask[]) => {
  const validate = ajv.compile(todoTasksSchema)

  if (!validate(todoTask)) {
    throw Error(`Invalid TodoTasks: ${ajv.errorsText(validate.errors)}`)
  }
}

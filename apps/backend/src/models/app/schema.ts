import Ajv from 'ajv'
import addFormats from 'ajv-formats'

import { IAppConnection } from './interface'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const appConfigSchema: any = {
  type: 'object',
  properties: {
    apiUrl: {
      type: 'string',
      nullable: true,
    },
    loginUrl: {
      type: 'string',
      nullable: true,
    },
    authorizeUrl: {
      type: 'string',
      nullable: true,
    },
    auth: {
      type: 'object',
      nullable: true,
      properties: {
        type: {
          type: 'string',
        },
        method: {
          type: 'string',
        },
        url: {
          type: 'string',
        },
        headers: {
          type: 'object',
          nullable: true,
        },
        fields: {
          type: 'object',
          nullable: true,
          properties: {
            username: {
              type: 'string',
            },
            password: {
              type: 'string',
            },
          },
          required: ['username', 'password'],
        },
      },
      required: ['type', 'method', 'url'],
    },
  },
}

export const appSchema: any = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    appId: {
      type: 'string',
    },
    config: appConfigSchema,
  },
  required: ['name', 'appId', 'config'],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connectionSchema: any = {
  type: 'object',
  properties: {
    appId: {
      type: 'string',
    },
    userId: {
      type: 'string',
    },
    connectionId: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    email: {
      type: 'string',
      format: 'email',
    },
    credentials: {
      type: 'object',
      properties: {
        refresh_token: {
          type: 'string',
          nullable: true,
        },
        access_token: {
          type: 'string',
          nullable: true,
        },
      },
      required: [],
    },
  },
  required: ['appId', 'userId', 'connectionId', 'name', 'email', 'credentials'],
}

const ajv = new Ajv()
addFormats(ajv)

export const validateAppConnection = (connection: IAppConnection) => {
  const validate = ajv.compile(connectionSchema)

  if (!validate(connection)) {
    throw Error(`Invalid AppConnection: ${ajv.errorsText(validate.errors)}`)
  }
}

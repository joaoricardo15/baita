import {
  AppConnectionSchema,
  AppSchema,
  BotSchema,
  ServiceSchema,
  TaskExecutionResultSchema,
  TaskSchema,
  UserSchema,
  VariableSchema,
} from '@baita/shared'
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { zodToJsonSchema } from 'zod-to-json-schema'

function toJsonSchema(schema: unknown, name: string) {
  const result = zodToJsonSchema(
    schema as Parameters<typeof zodToJsonSchema>[0],
    {
      name,
      $refStrategy: 'none',
    }
  )
  const { $schema, ...rest } = (result as Record<string, unknown>).definitions
    ? ((
        (result as Record<string, unknown>).definitions as Record<
          string,
          unknown
        >
      )[name] as Record<string, unknown>)
    : (result as Record<string, unknown>)
  void $schema
  return rest
}

const schemas = {
  ApiResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      data: {},
    },
    required: ['success'],
  },
  User: toJsonSchema(UserSchema, 'User'),
  Bot: toJsonSchema(BotSchema, 'Bot'),
  Task: toJsonSchema(TaskSchema, 'Task'),
  Service: toJsonSchema(ServiceSchema, 'Service'),
  App: toJsonSchema(AppSchema, 'App'),
  Variable: toJsonSchema(VariableSchema, 'Variable'),
  TaskExecutionResult: toJsonSchema(
    TaskExecutionResultSchema,
    'TaskExecutionResult'
  ),
  Connection: toJsonSchema(AppConnectionSchema, 'Connection'),
}

const parameters = {
  userId: {
    name: 'userId',
    in: 'path',
    required: true,
    schema: { type: 'string' },
    description: 'User ID (from Auth0 sub claim, prefix stripped)',
  },
  botId: {
    name: 'botId',
    in: 'path',
    required: true,
    schema: { type: 'string' },
    description: 'Bot UUID',
  },
  connectionId: {
    name: 'connectionId',
    in: 'path',
    required: true,
    schema: { type: 'string' },
    description: 'Connection UUID',
  },
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const param = (name: string) => ({ $ref: `#/components/parameters/${name}` })
const jsonBody = (schema: object) => ({
  required: true,
  content: { 'application/json': { schema } },
})
const apiResponse = (desc?: string) => ({
  200: {
    ...(desc ? { description: desc } : {}),
    content: { 'application/json': { schema: ref('ApiResponse') } },
  },
})

const paths = {
  '/user': {
    post: {
      summary: 'Create User',
      description:
        'Creates a new user account with DynamoDB record and SQS queue',
      tags: ['User'],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            example: 'google-oauth2|110944657139284874166',
          },
          name: { type: 'string', example: 'João' },
          email: { type: 'string', example: 'joao@baita.help' },
          picture: { type: 'string' },
        },
        required: ['user_id', 'name', 'email'],
      }),
      responses: apiResponse('User created'),
    },
  },
  '/user/{userId}': {
    delete: {
      summary: 'Delete User',
      description:
        'Deletes user account and all associated resources (bots, connections, DynamoDB records, SQS queue, Auth0 account)',
      tags: ['User'],
      parameters: [param('userId')],
      responses: apiResponse(),
    },
  },
  '/user/{userId}/content': {
    get: {
      summary: 'Get Content Feed',
      description:
        "Retrieves and deletes queued content items from the user's SQS feed (max 10 per call)",
      tags: ['Content'],
      parameters: [param('userId')],
      responses: apiResponse('Content items (may be empty array)'),
    },
  },
  '/user/{userId}/bot/create': {
    post: {
      summary: 'Create Bot',
      description:
        'Creates a new bot: generates sample Lambda, API Gateway endpoint, and EventBridge Scheduler',
      tags: ['Bot'],
      parameters: [param('userId')],
      responses: apiResponse('Bot created with infrastructure'),
    },
  },
  '/user/{userId}/bot/update/{botId}': {
    post: {
      summary: 'Update Bot',
      description:
        'Updates bot metadata (name, description, image, active state, tasks)',
      tags: ['Bot'],
      parameters: [param('userId'), param('botId')],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          botId: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          image: { type: 'string' },
          active: { type: 'boolean' },
          tasks: { type: 'array', items: ref('Task') },
        },
      }),
      responses: apiResponse(),
    },
  },
  '/user/{userId}/bot/delete/{botId}': {
    post: {
      summary: 'Delete Bot',
      description:
        'Deletes bot and all associated AWS resources (Lambda, API Gateway, Scheduler, S3 code, CloudWatch logs)',
      tags: ['Bot'],
      parameters: [param('userId'), param('botId')],
      responses: apiResponse(),
    },
  },
  '/user/{userId}/bot/deploy/{botId}': {
    post: {
      summary: 'Deploy Bot',
      description:
        'Validates tasks, generates Lambda code from task definitions, and deploys to AWS. If active=false, disables the scheduler.',
      tags: ['Bot'],
      parameters: [param('userId'), param('botId')],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          name: { type: 'string' },
          active: { type: 'boolean' },
          tasks: { type: 'array', items: ref('Task') },
        },
        required: ['tasks'],
      }),
      responses: apiResponse(),
    },
  },
  '/user/{userId}/bot/test/{botId}': {
    post: {
      summary: 'Test Bot Task',
      description:
        'Executes a single task in isolation. Pass the task object with taskIndex in the body.',
      tags: ['Bot'],
      parameters: [param('userId'), param('botId')],
      requestBody: jsonBody({
        allOf: [
          ref('Task'),
          {
            type: 'object',
            properties: {
              taskIndex: {
                type: 'integer',
                description: '0-based index of the task to test',
              },
            },
            required: ['taskIndex'],
          },
        ],
      }),
      responses: apiResponse(),
    },
  },
  '/user/{userId}/bot/logs/{botId}': {
    post: {
      summary: 'Get Bot Logs',
      description:
        'Queries CloudWatch for bot execution logs (last 10 days, max 20 results)',
      tags: ['Bot'],
      parameters: [param('userId'), param('botId')],
      requestBody: jsonBody({ type: 'object' }),
      responses: apiResponse(),
    },
  },
  '/user/{userId}/bot/model': {
    post: {
      summary: 'Deploy Bot Model',
      description: 'Creates and deploys a bot from a pre-built model/template',
      tags: ['Bot'],
      parameters: [param('userId')],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          modelId: { type: 'string' },
          name: { type: 'string' },
          author: { type: 'string' },
          description: { type: 'string' },
          tasks: { type: 'array', items: ref('Task') },
        },
        required: ['name', 'tasks'],
      }),
      responses: apiResponse(),
    },
  },
  '/user/{userId}/task/execute': {
    post: {
      summary: 'Execute Task',
      description:
        'Executes a single task independently (also accepts direct Lambda invoke with { direct: true }). Dispatches to code-execute, method-execute, or trigger-sample based on serviceName.',
      tags: ['Task'],
      parameters: [param('userId')],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          botId: { type: 'string' },
          userId: { type: 'string' },
          connectionId: { type: 'string' },
          appConfig: { type: 'object' },
          serviceConfig: { type: 'object' },
          inputData: {},
          serviceName: {
            type: 'string',
            enum: ['code-execute', 'method-execute', 'trigger-sample'],
          },
        },
        required: ['userId', 'botId', 'appConfig', 'serviceConfig'],
      }),
      responses: apiResponse(),
    },
  },
  '/user/{userId}/connection/create': {
    post: {
      summary: 'Create Connection',
      description:
        'Stores a new OAuth/API connection after successful authorization',
      tags: ['Connection'],
      parameters: [param('userId')],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          appId: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' },
          credentials: { type: 'object' },
          connectorId: { type: 'string' },
        },
        required: ['appId', 'credentials'],
      }),
      responses: apiResponse(),
    },
  },
  '/user/{userId}/connection/health/{connectionId}': {
    post: {
      summary: 'Health Check Connection',
      description:
        "Tests that a connection's credentials are still valid by calling the provider's health endpoint",
      tags: ['Connection'],
      parameters: [param('userId'), param('connectionId')],
      responses: apiResponse('Health status'),
    },
  },
  '/user/{userId}/connection/details/{connectionId}': {
    post: {
      summary: 'Get Connection Details',
      description:
        'Returns connection metadata and lists all bots that reference this connection',
      tags: ['Connection'],
      parameters: [param('userId'), param('connectionId')],
      responses: apiResponse(),
    },
  },
  '/user/{userId}/resource/{resourceName}/{operation}': {
    post: {
      summary: 'Resource Operation (without ID)',
      description:
        'Performs list or create operations on a named resource type (note, place, todo, bot, connection, model)',
      tags: ['Resource'],
      parameters: [
        param('userId'),
        {
          name: 'resourceName',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Resource type',
        },
        {
          name: 'operation',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['list', 'create'] },
        },
      ],
      requestBody: jsonBody({ type: 'object' }),
      responses: apiResponse(),
    },
  },
  '/user/{userId}/resource/{resourceName}/{operation}/{resourceId}': {
    post: {
      summary: 'Resource Operation (with ID)',
      description:
        'Performs read, update, delete, upload, or remove on a specific resource instance',
      tags: ['Resource'],
      parameters: [
        param('userId'),
        {
          name: 'resourceName',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
        {
          name: 'operation',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            enum: ['read', 'update', 'delete', 'upload', 'remove'],
          },
        },
        {
          name: 'resourceId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      requestBody: jsonBody({ type: 'object' }),
      responses: apiResponse(),
    },
  },
  '/connectors/oauth': {
    get: {
      summary: 'OAuth Callback',
      description:
        'Handles OAuth 2.0 callback from partner providers (Google, Pipedrive, etc.). Public endpoint — no auth required.',
      tags: ['Connectors'],
      security: [],
      parameters: [
        {
          name: 'code',
          in: 'query',
          schema: { type: 'string' },
          description: 'Authorization code from provider',
        },
        {
          name: 'state',
          in: 'query',
          schema: { type: 'string' },
          description:
            'Encoded state: appId:userId:botId:taskIndex:connectorId',
        },
        {
          name: 'error',
          in: 'query',
          schema: { type: 'string' },
          description: 'Error code if user denied',
        },
      ],
      responses: {
        200: { description: 'HTML response (closes popup window)' },
      },
    },
  },
}

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Baita Help API',
    description:
      'Personal automation platform — create bots that connect services, run on schedules, and publish results to your feed.',
    version: '2.0.0',
    contact: { url: 'https://github.com/joaoricardo15/baita' },
  },
  servers: [
    { url: 'https://api.baita.help', description: 'Production' },
    { url: 'http://localhost:5000/dev', description: 'Local Development' },
  ],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Auth0 JWT token (obtained via login flow)',
      },
    },
    schemas,
    parameters,
  },
  paths,
}

const outPath = resolve(__dirname, 'openapi.json')
writeFileSync(outPath, JSON.stringify(spec, null, 2) + '\n')
console.warn(`Generated ${outPath}`)

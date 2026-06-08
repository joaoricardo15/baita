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
import { readFileSync, writeFileSync } from 'fs'
import { DEFAULT_SCHEMA, load, Type } from 'js-yaml'
import { resolve } from 'path'
import { zodToJsonSchema } from 'zod-to-json-schema'

const cfnSchema = DEFAULT_SCHEMA.extend([
  new Type('!Ref', { kind: 'scalar', construct: (d) => ({ Ref: d }) }),
  new Type('!GetAtt', {
    kind: 'scalar',
    construct: (d) => ({ 'Fn::GetAtt': d }),
  }),
  new Type('!Sub', { kind: 'scalar', construct: (d) => ({ 'Fn::Sub': d }) }),
  new Type('!Sub', { kind: 'sequence', construct: (d) => ({ 'Fn::Sub': d }) }),
])

function toJsonSchema(schema: unknown, name: string) {
  const result = zodToJsonSchema(
    schema as Parameters<typeof zodToJsonSchema>[0],
    { name, $refStrategy: 'none' }
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

interface HttpEvent {
  path: string
  method: string
  authorizer?: unknown
}

interface ServerlessFunction {
  handler: string
  events?: { http: HttpEvent }[]
}

interface ServerlessConfig {
  functions: Record<string, ServerlessFunction>
}

interface OperationDoc {
  summary: string
  description: string
  requestSchema?: string
  responseSchema?: string
  parameterOverrides?: Record<string, { description: string; enum?: string[] }>
}

const OPERATION_DOCS: Record<string, OperationDoc> = {
  '/bots:get': {
    summary: 'List bots',
    description: 'Returns all bots owned by the authenticated user.',
    responseSchema: 'Bot',
  },
  '/bots:post': {
    summary: 'Create bot',
    description:
      'Creates a new empty bot and returns it with a generated ID and trigger URL.',
    responseSchema: 'Bot',
  },
  '/bots/{botId}:get': {
    summary: 'Get bot',
    description: 'Returns a specific bot by ID.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
    responseSchema: 'Bot',
  },
  '/bots/{botId}:patch': {
    summary: 'Update bot',
    description:
      'Updates bot properties: name, description, image, active state, or tasks.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
    requestSchema: 'Bot',
    responseSchema: 'Bot',
  },
  '/bots/{botId}:delete': {
    summary: 'Delete bot',
    description:
      'Permanently deletes the bot and all deployed AWS resources (Lambda, API Gateway, Scheduler, S3, CloudWatch logs).',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
  },
  '/bots/{botId}/deploy:post': {
    summary: 'Deploy bot',
    description:
      'Generates Lambda code from the bot task definitions, packages it, and deploys it as a standalone Lambda function with API Gateway trigger and optional EventBridge schedule.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
    requestSchema: 'Bot',
    responseSchema: 'Bot',
  },
  '/bots/{botId}/test:post': {
    summary: 'Test bot task',
    description:
      'Executes a single task step within the bot for testing. Returns the execution result including output data.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
    responseSchema: 'TaskExecutionResult',
  },
  '/bots/{botId}/logs:get': {
    summary: 'Get bot logs',
    description:
      'Retrieves recent execution logs from CloudWatch for the deployed bot Lambda.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
  },
  '/models:get': {
    summary: 'List bot models',
    description:
      'Returns all shared bot templates. Models are system-level and can be used as starting points for new bots.',
    responseSchema: 'Bot',
  },
  '/models:post': {
    summary: 'Create bot model',
    description: 'Creates a new shared bot template.',
    requestSchema: 'Bot',
    responseSchema: 'Bot',
  },
  '/models/{modelId}:get': {
    summary: 'Get bot model',
    description: 'Returns a specific shared bot model.',
    parameterOverrides: { modelId: { description: 'Model ID' } },
    responseSchema: 'Bot',
  },
  '/models/{modelId}:patch': {
    summary: 'Update bot model',
    description: 'Updates a shared bot model definition.',
    parameterOverrides: { modelId: { description: 'Model ID' } },
    requestSchema: 'Bot',
    responseSchema: 'Bot',
  },
  '/models/{modelId}:delete': {
    summary: 'Delete bot model',
    description: 'Removes a shared bot model.',
    parameterOverrides: { modelId: { description: 'Model ID' } },
  },
  '/models/{modelId}/deploy:post': {
    summary: 'Deploy model as bot',
    description:
      "Creates a new bot for the authenticated user from a shared model template, copying the model's tasks into the new bot.",
    parameterOverrides: { modelId: { description: 'Model ID' } },
    responseSchema: 'Bot',
  },
  '/connections:get': {
    summary: 'List connections',
    description:
      'Returns all OAuth and API-key connections owned by the authenticated user.',
    responseSchema: 'Connection',
  },
  '/connections:post': {
    summary: 'Create connection',
    description:
      'Creates a new API-key connection. OAuth connections are created via the system OAuth callback. Body must include `connectorId` and `apiKey`.',
    requestSchema: 'Connection',
    responseSchema: 'Connection',
  },
  '/connections/{connectionId}:get': {
    summary: 'Get connection details',
    description:
      'Returns the full connection record (credentials excluded) including a list of bots that reference this connection.',
    parameterOverrides: {
      connectionId: { description: 'Connection ID (UUID)' },
    },
    responseSchema: 'Connection',
  },
  '/connections/{connectionId}:delete': {
    summary: 'Delete connection',
    description: 'Removes the connection credentials.',
    parameterOverrides: {
      connectionId: { description: 'Connection ID (UUID)' },
    },
  },
  '/connections/{connectionId}/health:post': {
    summary: 'Check connection health',
    description:
      'Validates the connection credentials are still working by making a test API call to the provider. Automatically refreshes expired OAuth2 tokens.',
    parameterOverrides: {
      connectionId: { description: 'Connection ID (UUID)' },
    },
  },
  '/content:get': {
    summary: 'Get content feed',
    description:
      "Reads content items from the user's SQS queue. Items are consumed on read (one-time delivery) and will not appear again. Previously seen content is automatically deduplicated at publish time.",
  },
  '/tasks/execute:post': {
    summary: 'Execute a task',
    description:
      'Executes a single automation task (HTTP request, code execution, push notification, etc.). Used for testing individual steps before adding them to a bot workflow.',
    requestSchema: 'Task',
    responseSchema: 'TaskExecutionResult',
  },
  '/data/{type}:get': {
    summary: 'List data records',
    description:
      'Returns all records of the given type for the authenticated user.',
    parameterOverrides: {
      type: {
        description: 'Data type (e.g. note, place, todo, content, connection)',
      },
    },
  },
  '/data/{type}:post': {
    summary: 'Create data record',
    description: 'Creates a new record of the given type.',
    parameterOverrides: {
      type: {
        description: 'Data type (e.g. note, place, todo, content, connection)',
      },
    },
  },
  '/data/{type}/{id}:get': {
    summary: 'Get data record',
    description: 'Returns a specific record by type and ID.',
    parameterOverrides: {
      type: {
        description: 'Data type (e.g. note, place, todo, content, connection)',
      },
      id: { description: 'Record ID' },
    },
  },
  '/data/{type}/{id}:patch': {
    summary: 'Update data record',
    description: 'Updates a specific record.',
    parameterOverrides: {
      type: {
        description: 'Data type (e.g. note, place, todo, content, connection)',
      },
      id: { description: 'Record ID' },
    },
  },
  '/data/{type}/{id}:delete': {
    summary: 'Delete data record',
    description: 'Removes a specific record.',
    parameterOverrides: {
      type: {
        description: 'Data type (e.g. note, place, todo, content, connection)',
      },
      id: { description: 'Record ID' },
    },
  },
  '/data/{type}/{id}/upload:post': {
    summary: 'Get upload URL',
    description:
      'Returns a presigned S3 URL for file upload (PUT method, 15 min expiry).',
    parameterOverrides: {
      id: { description: 'Record ID' },
    },
  },
  '/data/{type}/{id}/files/{fileId}:delete': {
    summary: 'Remove uploaded file',
    description: 'Deletes an uploaded file from S3.',
    parameterOverrides: {
      id: { description: 'Record ID' },
      fileId: { description: 'File ID (S3 key)' },
    },
  },
  '/user:delete': {
    summary: 'Delete account',
    description:
      'Permanently deletes the authenticated user account, all bots (including deployed AWS resources), all stored data, and the SQS message queue. This action is irreversible.',
  },
}

const SYSTEM_ROUTES = new Set(['user:post', 'oauth/callback:get'])

function extractRoutes(): { path: string; method: string; hasAuth: boolean }[] {
  const raw = readFileSync(
    resolve(__dirname, '..', '..', 'serverless.yml'),
    'utf8'
  )
  const cleaned = raw.replace(/\$\{[^}]+\}/g, 'PLACEHOLDER')
  const config = load(cleaned, { schema: cfnSchema }) as ServerlessConfig

  const routes: { path: string; method: string; hasAuth: boolean }[] = []

  for (const fn of Object.values(config.functions)) {
    if (!fn.events) continue
    for (const event of fn.events) {
      if (!event.http) continue
      const { path, method, authorizer } = event.http
      if (SYSTEM_ROUTES.has(`${path}:${method.toLowerCase()}`)) continue
      routes.push({
        path: `/${path}`,
        method: method.toLowerCase(),
        hasAuth: !!authorizer,
      })
    }
  }

  return routes
}

function pathToTag(path: string): string {
  const segment = path.split('/')[1]
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

function generatePaths() {
  const routes = extractRoutes()
  const paths: Record<string, Record<string, object>> = {}

  for (const { path, method } of routes) {
    if (!paths[path]) paths[path] = {}

    const docKey = `${path}:${method}`
    const doc = OPERATION_DOCS[docKey]

    const entry: Record<string, unknown> = {
      summary: doc?.summary || `${method.toUpperCase()} ${path}`,
      tags: [pathToTag(path)],
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: doc?.responseSchema
                ? {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                      data: {
                        $ref: `#/components/schemas/${doc.responseSchema}`,
                      },
                    },
                    required: ['success'],
                  }
                : { $ref: '#/components/schemas/ApiResponse' },
            },
          },
        },
        401: { description: 'Unauthorized — missing or invalid JWT token' },
        500: { description: 'Internal server error' },
      },
    }

    if (doc?.description) {
      entry.description = doc.description
    }

    const matches = path.match(/\{(\w+)\}/g) || []
    if (matches.length) {
      entry.parameters = matches.map((match) => {
        const name = match.slice(1, -1)
        const override = doc?.parameterOverrides?.[name]
        const param: Record<string, unknown> = {
          name,
          in: 'path',
          required: true,
          schema: override?.enum
            ? { type: 'string', enum: override.enum }
            : { type: 'string' },
        }
        if (override?.description) {
          param.description = override.description
        }
        return param
      })
    }

    if (method === 'post' || method === 'patch') {
      entry.requestBody = {
        content: {
          'application/json': {
            schema: doc?.requestSchema
              ? { $ref: `#/components/schemas/${doc.requestSchema}` }
              : { type: 'object' },
          },
        },
      }
    }

    paths[path][method] = entry
  }

  return paths
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
  User: toJsonSchema(UserSchema, 'User'),
}

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Baita Help API',
    description:
      'Personal automation platform API. All endpoints require authentication via Auth0 JWT Bearer token. The userId is automatically extracted from your token — no need to include it in request URLs.',
    version: '4.0.0',
    contact: { url: 'https://github.com/joaoricardo15/baita' },
  },
  servers: [
    { url: 'https://api.baita.help', description: 'Production' },
    { url: 'http://localhost:5000/dev', description: 'Local Development' },
  ],
  tags: [
    {
      name: 'Bots',
      description: 'Create, deploy, test, and manage automation bots',
    },
    {
      name: 'Models',
      description: 'Shared bot templates (system-level)',
    },
    {
      name: 'Connections',
      description: 'OAuth and API-key connections to external services',
    },
    {
      name: 'Content',
      description: 'Content feed (SQS-based message queue)',
    },
    {
      name: 'Tasks',
      description: 'Execute individual automation steps for testing',
    },
    {
      name: 'Data',
      description:
        'Generic CRUD for user data (notes, places, todos, content reactions)',
    },
    { name: 'User', description: 'Account management' },
  ],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Auth0 JWT token — use the Login button above to authenticate automatically',
      },
    },
    schemas,
  },
  paths: generatePaths(),
}

const outPath = resolve(__dirname, 'openapi.json')
writeFileSync(outPath, JSON.stringify(spec, null, 2) + '\n')
console.warn(`Generated ${outPath} (${Object.keys(spec.paths).length} paths)`)

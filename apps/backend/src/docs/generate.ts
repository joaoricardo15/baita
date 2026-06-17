import {
  AppSchema,
  BotSchema,
  BotTemplateSchema,
  ConnectionSchema,
  getRegisteredTypes,
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
  operationId?: string
  requestSchema?: string
  responseSchema?: string
  requestExample?: Record<string, unknown>
  parameterOverrides?: Record<string, { description: string; enum?: string[] }>
}

const DATA_TYPE_PARAM = {
  description: 'Registered data entity type',
  enum: getRegisteredTypes(),
}

const OPERATION_DOCS: Record<string, OperationDoc> = {
  '/bots:get': {
    summary: 'List bots',
    operationId: 'listBots',
    description: 'Returns all automation bots owned by the authenticated user.',
    responseSchema: 'Bot',
  },
  '/bots:post': {
    summary: 'Create bot',
    operationId: 'createBot',
    description:
      'Creates a new empty bot with a server-generated ID and webhook trigger URL.',
    responseSchema: 'Bot',
  },
  '/bots/{botId}:get': {
    summary: 'Get bot',
    operationId: 'getBot',
    description:
      'Returns a specific bot including its task definitions, deployment state, and trigger URL.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
    responseSchema: 'Bot',
  },
  '/bots/{botId}:patch': {
    summary: 'Update bot',
    operationId: 'updateBot',
    description:
      'Partially updates a bot. Send only the fields to change: name, description, image, active state, or tasks array.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
    requestSchema: 'Bot',
    requestExample: {
      name: 'Renamed Bot',
      description: 'Updated description',
      active: false,
    },
    responseSchema: 'Bot',
  },
  '/bots/{botId}:delete': {
    summary: 'Delete bot',
    operationId: 'deleteBot',
    description:
      'Permanently deletes the bot and all its deployed AWS resources (EventBridge schedule group and schedule).',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
  },
  '/bots/{botId}/deploy:post': {
    summary: 'Deploy bot',
    operationId: 'deployBot',
    description:
      'Activates or deactivates the bot schedule. When active with a schedule trigger, enables the EventBridge schedule. The bot tasks must pass validation before deployment.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
    requestSchema: 'Bot',
    requestExample: {
      name: 'My Daily Bot',
      active: true,
      tasks: [],
    },
    responseSchema: 'Bot',
  },
  '/bots/{botId}/test:post': {
    summary: 'Test bot task',
    operationId: 'testBotTask',
    description:
      'Executes a single task step for testing. Provide the task definition and its index within the bot. Returns the execution result with input/output data and status. For trigger steps (index 0), returns the last stored trigger sample.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
    requestExample: {
      taskIndex: 1,
      task: {
        taskId: 1,
        service: { name: 'code-execute' },
        inputData: [{ name: 'code', value: 'return { greeting: "hello" }' }],
      },
    },
    responseSchema: 'TaskExecutionResult',
  },
  '/bots/{botId}/logs:get': {
    summary: 'Get bot execution logs',
    operationId: 'getBotLogs',
    description:
      'Retrieves recent execution logs from CloudWatch for this bot. Returns up to 100 log entries from the last 14 days.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
  },
  '/bots/{botId}/run/{token}:post': {
    summary: 'Trigger bot execution',
    operationId: 'triggerBot',
    description:
      'Public webhook endpoint — no JWT required. The token encodes the owner userId. If the bot is active, invokes the bot engine asynchronously. If inactive, stores the request payload as a trigger sample for testing.',
    parameterOverrides: {
      botId: { description: 'Bot ID (UUID)' },
      token: {
        description: 'Trigger token (encodes userId, obtained from bot record)',
      },
    },
    requestExample: {
      event: 'new_order',
      orderId: 'ORD-12345',
      customer: { name: 'Alice', email: 'alice@example.com' },
    },
  },
  '/bot-templates:get': {
    summary: 'List bot templates',
    operationId: 'listBotTemplates',
    description:
      'Returns all shared bot templates. Templates are system-level resources that any authenticated user can browse and deploy as their own bot.',
    responseSchema: 'BotTemplate',
  },
  '/bot-templates/{templateId}:get': {
    summary: 'Get bot template',
    operationId: 'getBotTemplate',
    description: 'Returns a specific shared bot template by ID.',
    parameterOverrides: { templateId: { description: 'Template ID (UUID)' } },
    responseSchema: 'BotTemplate',
  },
  '/bot-templates/{templateId}:put': {
    summary: 'Create or replace bot template',
    operationId: 'putBotTemplate',
    description:
      'Creates a new shared bot template or replaces an existing one. The client provides the templateId. The request body must include the full template definition with tasks array.',
    parameterOverrides: { templateId: { description: 'Template ID (UUID)' } },
    requestSchema: 'BotTemplate',
    requestExample: {
      templateId: 'my-template-id',
      name: 'Daily News Digest',
      author: 'baita',
      description: 'Fetches headlines and publishes to feed',
      image: '/icons/newsapi.svg',
      tasks: [],
    },
    responseSchema: 'BotTemplate',
  },
  '/bot-templates/{templateId}:delete': {
    summary: 'Delete bot template',
    operationId: 'deleteBotTemplate',
    description: 'Permanently removes a shared bot template.',
    parameterOverrides: { templateId: { description: 'Template ID (UUID)' } },
  },
  '/bot-templates/{templateId}/deploy:post': {
    summary: 'Deploy template as bot',
    operationId: 'deployBotTemplate',
    description:
      "Creates a new bot for the authenticated user from a shared template. Copies the template's task definitions into a fresh bot owned by the current user.",
    parameterOverrides: { templateId: { description: 'Template ID (UUID)' } },
    responseSchema: 'Bot',
  },
  '/connections:get': {
    summary: 'List connections',
    operationId: 'listConnections',
    description:
      'Returns all OAuth and API-key connections owned by the authenticated user. Credentials are included in the response.',
    responseSchema: 'Connection',
  },
  '/connections:post': {
    summary: 'Create API-key connection',
    operationId: 'createConnection',
    description:
      'Creates a new connection using an API key. The server generates a UUID for the connection. OAuth connections are created automatically via the OAuth callback flow.',
    requestSchema: 'Connection',
    requestExample: {
      connectorId: 'newsapi',
      apiKey: 'your-api-key-here',
    },
    responseSchema: 'Connection',
  },
  '/connections/{connectionId}:get': {
    summary: 'Get connection details',
    operationId: 'getConnection',
    description:
      'Returns the connection record (credentials excluded for security) along with a list of bots that reference this connection in their task definitions.',
    parameterOverrides: {
      connectionId: { description: 'Connection ID' },
    },
  },
  '/connections/{connectionId}:delete': {
    summary: 'Delete connection',
    operationId: 'deleteConnection',
    description:
      'Permanently removes the connection and its stored credentials. Bots referencing this connection will fail on their next execution.',
    parameterOverrides: {
      connectionId: { description: 'Connection ID' },
    },
  },
  '/connections/{connectionId}/health:post': {
    summary: 'Check connection health',
    operationId: 'checkConnectionHealth',
    description:
      'Tests whether the stored credentials are still valid by making a probe request to the provider. For OAuth2 connections with expired tokens, automatically attempts a token refresh. Returns status: healthy, expired, error, or unknown.',
    parameterOverrides: {
      connectionId: { description: 'Connection ID' },
    },
  },
  '/content:get': {
    summary: 'Get content feed',
    operationId: 'getContentFeed',
    description:
      "Returns fresh (unseen) content items from the user's feed. Items remain until the user reacts to them. Unread content auto-expires after 7 days via DynamoDB TTL.",
  },
  '/content/{contentId}:patch': {
    summary: 'React to content',
    operationId: 'reactToContent',
    description:
      'Marks a content item as seen and records the reaction. Once reacted, the item is permanently stored (TTL removed) and no longer appears in the feed.',
    parameterOverrides: {
      contentId: { description: 'Content item ID' },
    },
    requestExample: {
      reaction: 'like',
    },
  },
  '/data/{type}:get': {
    summary: 'List or read data',
    operationId: 'listData',
    description:
      'For collection types (feeling, place, connection): returns all records as an array. For singleton types (todo, user): returns the single record directly.',
    parameterOverrides: {
      type: DATA_TYPE_PARAM,
    },
  },
  '/data/{type}:put': {
    summary: 'Write singleton data',
    operationId: 'putSingletonData',
    description:
      'Creates or replaces a singleton record (no ID needed). Used for types that have exactly one record per user (e.g., todo).',
    parameterOverrides: {
      type: DATA_TYPE_PARAM,
    },
    requestExample: {
      tasks: [
        {
          taskId: '1',
          title: 'Buy groceries',
          done: false,
          createdAt: 1718000000000,
          updatedAt: 1718000000000,
        },
      ],
    },
  },
  '/data/{type}/{id}:put': {
    summary: 'Create or replace data record',
    operationId: 'putDataRecord',
    description:
      'Creates a new record or fully replaces an existing one at the given ID. Client provides the ID (idempotent).',
    parameterOverrides: {
      type: DATA_TYPE_PARAM,
      id: { description: 'Record ID (client-generated)' },
    },
    requestExample: {
      feelingId: 'feeling-abc123',
      content: 'Feeling great today',
      createdAt: 1718000000000,
      updatedAt: 1718000000000,
    },
  },
  '/data/{type}/{id}:get': {
    summary: 'Get data record',
    operationId: 'getDataRecord',
    description: 'Returns a specific record by type and ID.',
    parameterOverrides: {
      type: DATA_TYPE_PARAM,
      id: { description: 'Record ID' },
    },
  },
  '/data/{type}/{id}:patch': {
    summary: 'Partially update data record',
    operationId: 'updateDataRecord',
    description:
      'Updates only the provided fields on an existing record. Fields not included remain unchanged.',
    parameterOverrides: {
      type: DATA_TYPE_PARAM,
      id: { description: 'Record ID' },
    },
    requestExample: {
      title: 'Updated title',
      updatedAt: 1718100000000,
    },
  },
  '/data/{type}/{id}:delete': {
    summary: 'Delete data record',
    operationId: 'deleteDataRecord',
    description: 'Permanently removes a specific record.',
    parameterOverrides: {
      type: DATA_TYPE_PARAM,
      id: { description: 'Record ID' },
    },
  },
  '/data/{type}/{id}/upload:post': {
    summary: 'Get file upload URL',
    operationId: 'getUploadUrl',
    description:
      'Returns a presigned S3 PUT URL (15-minute expiry) for uploading a file associated with this record. PUT the file content directly to the returned URL.',
    parameterOverrides: {
      type: DATA_TYPE_PARAM,
      id: { description: 'Record ID' },
    },
  },
  '/data/{type}/{id}/files/{fileId}:delete': {
    summary: 'Remove uploaded file',
    operationId: 'deleteFile',
    description:
      'Deletes a previously uploaded file from S3. The fileId corresponds to the S3 object key.',
    parameterOverrides: {
      type: DATA_TYPE_PARAM,
      id: { description: 'Record ID' },
      fileId: { description: 'File identifier (S3 object key)' },
    },
  },
  '/user:delete': {
    summary: 'Delete account',
    operationId: 'deleteUser',
    description:
      'Permanently and irreversibly deletes the authenticated user account. Cascades to: all bots (including EventBridge schedules), all data records, all connections, and the Auth0 user record.',
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

function generateOperationId(path: string, method: string): string {
  const segments = path
    .replace(/^\//, '')
    .split('/')
    .filter((s) => !s.startsWith('{'))
  const resource = segments.join('_')
  return `${method}_${resource}`
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
      operationId: doc?.operationId || generateOperationId(path, method),
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

    if (method === 'post' || method === 'patch' || method === 'put') {
      const schemaOrGeneric = doc?.requestSchema
        ? { $ref: `#/components/schemas/${doc.requestSchema}` }
        : { type: 'object' }

      const mediaType: Record<string, unknown> = { schema: schemaOrGeneric }
      if (doc?.requestExample) {
        mediaType.example = doc.requestExample
      }

      entry.requestBody = {
        content: { 'application/json': mediaType },
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
  BotTemplate: toJsonSchema(BotTemplateSchema, 'BotTemplate'),
  Task: toJsonSchema(TaskSchema, 'Task'),
  Service: toJsonSchema(ServiceSchema, 'Service'),
  App: toJsonSchema(AppSchema, 'App'),
  Variable: toJsonSchema(VariableSchema, 'Variable'),
  TaskExecutionResult: toJsonSchema(
    TaskExecutionResultSchema,
    'TaskExecutionResult'
  ),
  Connection: toJsonSchema(ConnectionSchema, 'Connection'),
  User: toJsonSchema(UserSchema, 'User'),
}

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Baita API',
    description:
      'Personal automation platform. All endpoints require a valid Auth0 JWT Bearer token unless otherwise noted. The authenticated user is extracted from the token automatically — no userId in request paths.',
    version: '4.0.0',
    contact: { url: 'https://github.com/joaoricardo15/baita' },
  },
  servers: [
    { url: 'https://api.baita.help', description: 'Production' },
    { url: 'http://localhost:5000/dev', description: 'Local development' },
  ],
  tags: [
    {
      name: 'Bots',
      description:
        'Automation bots — workflows that execute tasks on a schedule or webhook trigger',
    },
    {
      name: 'Bot-templates',
      description:
        'Shared automation templates that users can browse and deploy as their own bots',
    },
    {
      name: 'Connections',
      description:
        'Authenticated connections to third-party services (OAuth2 or API key)',
    },
    {
      name: 'Content',
      description: 'Personalized content feed populated by bot automations',
    },
    {
      name: 'Data',
      description:
        'Generic CRUD storage for user data records (feelings, places, todos, and any registered entity type)',
    },
    {
      name: 'User',
      description: 'Account management (deletion)',
    },
  ],
  security: [{ auth0: ['openid'] }],
  components: {
    securitySchemes: {
      auth0: {
        type: 'oauth2',
        description:
          'Click Authorize, login with your Baita account, then close the popup. All requests will include your token automatically.',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://auth.baita.help/authorize',
            tokenUrl: 'https://auth.baita.help/oauth/token',
            scopes: {
              openid: 'Required for authentication',
            },
          },
        },
      },
    },
    schemas,
  },
  paths: generatePaths(),
}

const outPath = resolve(__dirname, 'openapi.json')
writeFileSync(outPath, JSON.stringify(spec, null, 2) + '\n')
console.warn(`Generated ${outPath} (${Object.keys(spec.paths).length} paths)`)

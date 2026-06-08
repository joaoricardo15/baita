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
    description: 'Returns all automation bots owned by the authenticated user.',
    responseSchema: 'Bot',
  },
  '/bots:post': {
    summary: 'Create bot',
    description:
      'Creates a new empty bot with a server-generated ID and webhook trigger URL.',
    responseSchema: 'Bot',
  },
  '/bots/{botId}:get': {
    summary: 'Get bot',
    description:
      'Returns a specific bot including its task definitions, deployment state, and trigger URL.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
    responseSchema: 'Bot',
  },
  '/bots/{botId}:patch': {
    summary: 'Update bot',
    description:
      'Partially updates a bot. Send only the fields to change: name, description, image, active state, or tasks array.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
    requestSchema: 'Bot',
    responseSchema: 'Bot',
  },
  '/bots/{botId}:delete': {
    summary: 'Delete bot',
    description:
      'Permanently deletes the bot and all its deployed AWS resources (Lambda function, API Gateway endpoint, EventBridge schedule, S3 code package, and CloudWatch log group).',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
  },
  '/bots/{botId}/deploy:post': {
    summary: 'Deploy bot',
    description:
      'Generates executable Lambda code from the bot task definitions, packages it as a ZIP, uploads to S3, and deploys as a standalone Lambda with API Gateway trigger and optional EventBridge schedule. The bot must pass validation before deployment.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
    requestSchema: 'Bot',
    responseSchema: 'Bot',
  },
  '/bots/{botId}/test:post': {
    summary: 'Test bot task',
    description:
      'Executes a single task step within the bot for testing purposes. Provide the task definition and taskIndex in the request body. Returns the execution result including output data and status.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
    responseSchema: 'TaskExecutionResult',
  },
  '/bots/{botId}/logs:get': {
    summary: 'Get bot execution logs',
    description:
      'Retrieves recent execution logs from CloudWatch for the deployed bot Lambda. Optionally filter by search terms via query parameters.',
    parameterOverrides: { botId: { description: 'Bot ID (UUID)' } },
  },
  '/models:get': {
    summary: 'List bot models',
    description:
      'Returns all shared bot model templates. Models are system-level resources that any authenticated user can browse and deploy as their own bot.',
    responseSchema: 'Bot',
  },
  '/models/{modelId}:get': {
    summary: 'Get bot model',
    description: 'Returns a specific shared bot model template by ID.',
    parameterOverrides: { modelId: { description: 'Model ID (UUID)' } },
    responseSchema: 'Bot',
  },
  '/models/{modelId}:put': {
    summary: 'Create or replace bot model',
    description:
      'Creates a new shared bot model or replaces an existing one. The client provides the modelId. The request body must include the full model definition with tasks array.',
    parameterOverrides: { modelId: { description: 'Model ID (UUID)' } },
    requestSchema: 'Bot',
    responseSchema: 'Bot',
  },
  '/models/{modelId}:delete': {
    summary: 'Delete bot model',
    description: 'Permanently removes a shared bot model template.',
    parameterOverrides: { modelId: { description: 'Model ID (UUID)' } },
  },
  '/models/{modelId}/deploy:post': {
    summary: 'Deploy model as bot',
    description:
      "Creates a new bot for the authenticated user from a shared model template. Copies the model's task definitions into a fresh bot owned by the current user.",
    parameterOverrides: { modelId: { description: 'Model ID (UUID)' } },
    responseSchema: 'Bot',
  },
  '/connections:get': {
    summary: 'List connections',
    description:
      'Returns all OAuth and API-key connections owned by the authenticated user. Credentials are included in the response.',
    responseSchema: 'Connection',
  },
  '/connections:post': {
    summary: 'Create API-key connection',
    description:
      'Creates a new connection using an API key. The server generates a UUID for the connection. OAuth connections are created automatically via the OAuth callback flow. Request body must include `connectorId` and `apiKey`.',
    requestSchema: 'Connection',
    responseSchema: 'Connection',
  },
  '/connections/{connectionId}:get': {
    summary: 'Get connection details',
    description:
      'Returns the connection record (credentials excluded for security) along with a list of bots that reference this connection in their task definitions.',
    parameterOverrides: {
      connectionId: { description: 'Connection ID' },
    },
  },
  '/connections/{connectionId}:delete': {
    summary: 'Delete connection',
    description:
      'Permanently removes the connection and its stored credentials. Bots referencing this connection will fail on their next execution.',
    parameterOverrides: {
      connectionId: { description: 'Connection ID' },
    },
  },
  '/connections/{connectionId}/health:post': {
    summary: 'Check connection health',
    description:
      'Tests whether the stored credentials are still valid by making a probe request to the provider. For OAuth2 connections with expired tokens, automatically attempts a token refresh before reporting status. Returns: healthy, expired, error, or unknown.',
    parameterOverrides: {
      connectionId: { description: 'Connection ID' },
    },
  },
  '/content:get': {
    summary: 'Get content feed',
    description:
      "Reads and consumes content items from the user's SQS message queue. Items are delivered once — they are deleted from the queue immediately after reading. Content is published to the queue by bot automations. Previously seen items are deduplicated at publish time.",
  },
  '/tasks/execute:post': {
    summary: 'Execute a task',
    description:
      'Executes a single automation task step (HTTP request, JavaScript code, push notification, OAuth2 API call, etc.). Used for testing individual steps in the bot builder before deployment. The request body is a complete task definition including service, app, and input variables.',
    requestSchema: 'Task',
    responseSchema: 'TaskExecutionResult',
  },
  '/data/{type}:get': {
    summary: 'List or read data',
    description:
      'For collection types (note, place, connection): returns all records of that type as an array. For singleton types (todo): returns the single record directly. The type parameter determines which DynamoDB partition prefix to query.',
    parameterOverrides: {
      type: {
        description:
          'Data type name (e.g. note, place, todo, content, connection)',
      },
    },
  },
  '/data/{type}:put': {
    summary: 'Write singleton data',
    description:
      'Creates or replaces a singleton record (no ID needed). Used for types that have exactly one record per user, like todo. The full record body replaces any existing data.',
    parameterOverrides: {
      type: {
        description: 'Data type name (e.g. todo)',
      },
    },
  },
  '/data/{type}/{id}:put': {
    summary: 'Create or replace data record',
    description:
      'Creates a new record or fully replaces an existing one at the given ID. The client provides the ID (idempotent operation). Send the complete record body.',
    parameterOverrides: {
      type: {
        description: 'Data type name (e.g. note, place, content, connection)',
      },
      id: { description: 'Record ID (client-generated)' },
    },
  },
  '/data/{type}/{id}:get': {
    summary: 'Get data record',
    description: 'Returns a specific record by type and ID.',
    parameterOverrides: {
      type: {
        description: 'Data type name (e.g. note, place, content, connection)',
      },
      id: { description: 'Record ID' },
    },
  },
  '/data/{type}/{id}:patch': {
    summary: 'Partially update data record',
    description:
      'Updates only the provided fields on an existing record. Fields not included in the request body remain unchanged.',
    parameterOverrides: {
      type: {
        description: 'Data type name (e.g. note, place, content, connection)',
      },
      id: { description: 'Record ID' },
    },
  },
  '/data/{type}/{id}:delete': {
    summary: 'Delete data record',
    description: 'Permanently removes a specific record.',
    parameterOverrides: {
      type: {
        description: 'Data type name (e.g. note, place, content, connection)',
      },
      id: { description: 'Record ID' },
    },
  },
  '/data/{type}/{id}/upload:post': {
    summary: 'Get file upload URL',
    description:
      'Returns a presigned S3 PUT URL (15-minute expiry) for uploading a file associated with this record. The client should PUT the file content directly to the returned URL.',
    parameterOverrides: {
      type: { description: 'Data type name (e.g. place, image)' },
      id: { description: 'Record ID' },
    },
  },
  '/data/{type}/{id}/files/{fileId}:delete': {
    summary: 'Remove uploaded file',
    description:
      'Deletes a previously uploaded file from S3. The fileId corresponds to the S3 object key.',
    parameterOverrides: {
      type: { description: 'Data type name' },
      id: { description: 'Record ID' },
      fileId: { description: 'File identifier (S3 object key)' },
    },
  },
  '/user:delete': {
    summary: 'Delete account',
    description:
      'Permanently and irreversibly deletes the authenticated user account. This cascades to: all bots (including deployed Lambda functions, API Gateway endpoints, and EventBridge schedules), all stored data records, all connections, and the SQS content queue.',
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

    if (method === 'post' || method === 'patch' || method === 'put') {
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
      name: 'Models',
      description:
        'Shared bot templates that users can deploy as their own bots',
    },
    {
      name: 'Connections',
      description:
        'Authenticated connections to third-party services (OAuth2 or API key)',
    },
    {
      name: 'Content',
      description:
        'Personalized content feed populated by bot automations (SQS-backed, consumed on read)',
    },
    {
      name: 'Tasks',
      description:
        'Execute individual automation steps for testing before deployment',
    },
    {
      name: 'Data',
      description:
        'Generic CRUD storage for user data records (notes, places, todos, and any custom type)',
    },
    {
      name: 'User',
      description: 'Account management (deletion)',
    },
  ],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Auth0 JWT Bearer token',
      },
    },
    schemas,
  },
  paths: generatePaths(),
}

const outPath = resolve(__dirname, 'openapi.json')
writeFileSync(outPath, JSON.stringify(spec, null, 2) + '\n')
console.warn(`Generated ${outPath} (${Object.keys(spec.paths).length} paths)`)

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
  '/bot/{operation}:post': {
    summary: 'Bot collection operations (no ID required)',
    description:
      'Collection-level bot operations that do not target a specific bot. **create** — creates a new bot and returns the generated ID. **model** — creates a bot from a shared model template (modelId in body).',
    parameterOverrides: {
      operation: {
        description: 'Collection operation',
        enum: ['create', 'model'],
      },
    },
    responseSchema: 'Bot',
  },
  '/bot/{operation}/{botId}:post': {
    summary: 'Bot item operations (specific bot by ID)',
    description:
      'Item-level operations on a specific bot identified by `botId`. **update** — updates bot name, description, image, active state, or tasks. **delete** — permanently deletes the bot and all deployed AWS resources. **deploy** — generates Lambda code and deploys. **test** — executes a single task step for testing. **logs** — retrieves recent execution logs from CloudWatch.',
    parameterOverrides: {
      operation: {
        description: 'Item operation',
        enum: ['update', 'delete', 'deploy', 'test', 'logs'],
      },
      botId: { description: 'Bot ID (UUID)' },
    },
    requestSchema: 'Bot',
    responseSchema: 'Bot',
  },
  '/resource/{resourceName}/{operation}:post': {
    summary: 'Resource collection operations (no ID required)',
    description:
      'Collection-level CRUD for user resources. **list** — returns all records of the given type.',
    parameterOverrides: {
      resourceName: {
        description: 'Resource type',
        enum: ['todo', 'connection', 'model', 'note', 'content'],
      },
      operation: { description: 'Collection operation', enum: ['list'] },
    },
  },
  '/resource/{resourceName}/{operation}/{resourceId}:post': {
    summary: 'Resource item operations (specific record by ID)',
    description:
      'Item-level operations on a specific resource record. **read** — returns the record. **create** — creates a new record with the given ID. **update** — replaces the record with the request body. **delete** — removes the record. **upload** — returns a presigned S3 URL for file upload. **remove** — deletes an uploaded file from S3.',
    parameterOverrides: {
      resourceName: {
        description: 'Resource type',
        enum: ['todo', 'connection', 'model', 'note', 'content'],
      },
      operation: {
        description: 'Item operation',
        enum: ['create', 'read', 'update', 'delete', 'upload', 'remove'],
      },
      resourceId: { description: 'Resource record ID' },
    },
  },
  '/connection/{operation}:post': {
    summary: 'Connection collection operations (no ID required)',
    description:
      'Collection-level connection operations. **create** — creates a new OAuth or API-key connection. The request body must include `connectorId` and `apiKey`.',
    parameterOverrides: {
      operation: {
        description: 'Collection operation',
        enum: ['create'],
      },
    },
    requestSchema: 'Connection',
    responseSchema: 'Connection',
  },
  '/connection/{operation}/{connectionId}:post': {
    summary: 'Connection item operations (specific connection by ID)',
    description:
      'Item-level operations on a specific connection identified by `connectionId`. **health** — validates the connection credentials are still working (makes a test API call to the provider). **details** — returns the full connection record including linked bots.',
    parameterOverrides: {
      operation: {
        description: 'Item operation',
        enum: ['health', 'details'],
      },
      connectionId: { description: 'Connection ID (UUID)' },
    },
    responseSchema: 'Connection',
  },
  '/task/{operation}:post': {
    summary: 'Execute a task',
    description:
      'Executes a single automation task (HTTP request, code execution, push notification, etc.). Used for testing individual steps before adding them to a bot workflow. The request body is a full task definition including service, app, and input variables.',
    parameterOverrides: {
      operation: { description: 'Execution mode', enum: ['execute'] },
    },
    requestSchema: 'Task',
    responseSchema: 'TaskExecutionResult',
  },
  '/model/{operation}:post': {
    summary: 'Shared bot models (list, create)',
    description:
      'Operations on shared bot templates. Models are system-level (not user-scoped) and can be used as starting points for new bots. **list** — returns all available models. **create** — creates a new shared model.',
    parameterOverrides: {
      operation: { description: 'CRUD operation', enum: ['list', 'create'] },
    },
    responseSchema: 'Bot',
  },
  '/model/{operation}/{modelId}:post': {
    summary: 'Shared bot model with ID (read, update, delete)',
    description:
      'Operations on a specific shared bot model. **read** — returns the model. **update** — replaces the model definition. **delete** — removes the model.',
    parameterOverrides: {
      operation: {
        description: 'CRUD operation',
        enum: ['read', 'update', 'delete'],
      },
      modelId: { description: 'Model ID' },
    },
    requestSchema: 'Bot',
    responseSchema: 'Bot',
  },
  '/user:delete': {
    summary: 'Delete account',
    description:
      'Permanently deletes the authenticated user account, all bots (including deployed AWS Lambda/API Gateway/Scheduler resources), all stored resources, and the SQS message queue. This action is irreversible.',
  },
  '/content:get': {
    summary: 'Get content feed',
    description:
      "Reads content items from the user's SQS queue. Items are consumed on read (one-time delivery) and will not appear again. Previously seen content is automatically deduplicated at publish time.",
  },
}

const SYSTEM_ROUTES = new Set(['user:post', 'connectors/oauth:get'])

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

    if (method === 'post') {
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
      'Personal automation platform API. All endpoints require authentication via Auth0 JWT Bearer token. The userId is automatically extracted from your token — no need to include it in request URLs. Use the "Authorize" button to log in with your Auth0 account.',
    version: '3.0.0',
    contact: { url: 'https://github.com/joaoricardo15/baita' },
  },
  servers: [
    { url: 'https://api.baita.help', description: 'Production' },
    { url: 'http://localhost:5000/dev', description: 'Local Development' },
  ],
  tags: [
    {
      name: 'Bot',
      description: 'Create, deploy, test, and manage automation bots',
    },
    {
      name: 'Resource',
      description:
        'Generic CRUD for user data (todos, notes, connections, content)',
    },
    {
      name: 'Connection',
      description: 'OAuth and API-key connections to external services',
    },
    {
      name: 'Task',
      description: 'Execute individual automation steps for testing',
    },
    { name: 'Model', description: 'Shared bot templates (system-level)' },
    { name: 'User', description: 'Account management' },
    { name: 'Content', description: 'Content feed (SQS-based message queue)' },
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

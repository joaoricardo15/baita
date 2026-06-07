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

function pathToSummary(path: string, method: string): string {
  const parts = path.split('/').filter(Boolean)
  const clean = parts
    .filter((p) => !p.startsWith('{'))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
  return `${method.toUpperCase()} ${clean}`
}

function pathToParameters(path: string) {
  const params: object[] = []
  const matches = path.match(/\{(\w+)\}/g) || []
  for (const match of matches) {
    const name = match.slice(1, -1)
    params.push({
      name,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    })
  }
  return params
}

function generatePaths() {
  const routes = extractRoutes()
  const paths: Record<string, Record<string, object>> = {}

  for (const { path, method } of routes) {
    if (!paths[path]) paths[path] = {}

    const entry: Record<string, unknown> = {
      summary: pathToSummary(path, method),
      tags: [pathToTag(path)],
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiResponse' },
            },
          },
        },
      },
    }

    const params = pathToParameters(path)
    if (params.length) entry.parameters = params

    if (method === 'post') {
      entry.requestBody = {
        content: {
          'application/json': { schema: { type: 'object' } },
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
  security: [{ oauth2: [] }, { bearerAuth: [] }],
  components: {
    securitySchemes: {
      oauth2: {
        type: 'oauth2',
        description: 'Auth0 login (recommended — click Authorize above)',
        flows: {
          implicit: {
            authorizationUrl:
              'https://auth.baita.help/authorize?audience=https://dev-yc4pbydg.us.auth0.com/api/v2/',
            scopes: {},
          },
        },
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Auth0 JWT token (paste manually if OAuth flow unavailable)',
      },
    },
    schemas,
  },
  paths: generatePaths(),
}

const outPath = resolve(__dirname, 'openapi.json')
writeFileSync(outPath, JSON.stringify(spec, null, 2) + '\n')
console.warn(`Generated ${outPath} (${Object.keys(spec.paths).length} paths)`)

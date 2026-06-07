# Connector Service Testing Guide

How to test any connector service via the standalone task execution endpoint. This guide serves both developers working on the platform and AI assistants helping users build automations.

## Overview

Every connector service can be tested independently using:

```
POST /task/execute
```

This endpoint accepts a single task object, resolves its input data, executes the service, and returns the result — no bot creation or deployment needed.

## How It Works

### Request

Send a POST with an `ITask` body:

```typescript
{
  taskId: number,           // Any number (0 for standalone)
  connectionId?: string,    // Required for OAuth2/userApiKey connectors
  app: {                    // From connectorToAppService()
    name: string,
    appId: string,
    icon: string,
    config: { apiUrl, auth? }
  },
  service: {                // Defines WHAT to execute
    type: 'invoke',
    name: 'code-execute' | 'method-execute',
    label: string,
    config: {
      methodName?: string,  // For method-execute
      inputFields: [...],   // Field schema
      outputPath?: string,  // JSONPath to extract from response
      outputMapping?: {},   // Field rename mapping
    }
  },
  inputData: [...]          // Field values matching inputFields
}
```

### Response

```typescript
{
  success: boolean,
  data: {
    status: 'success' | 'fail' | 'filtered',
    inputData: object,      // Resolved flat input
    outputData: any,        // Service result (or error message on fail)
    timestamp: number
  }
}
```

### Input Data Resolution

The backend resolves `inputData` by matching each entry in `service.config.inputFields` with a corresponding entry in `task.inputData` by `name`. Special field types:

| Type          | Resolution                                                  |
| ------------- | ----------------------------------------------------------- |
| `constant`    | Uses `value` directly from the field definition             |
| `environment` | Reads `process.env[value]` on the server                    |
| `text`        | Uses `value` from inputData                                 |
| `output`      | Uses `value` or `sampleValue` from inputData (in test mode) |
| `code`        | Passed as-is to the code executor                           |
| `options`     | Uses selected `value`                                       |
| `user`        | Auto-filled from user context                               |

Nested field names (e.g., `queryParams.country`) produce nested objects: `{ queryParams: { country: 'us' } }`.

---

## Connector Examples

### Baita — Run JavaScript

No connection needed. Executes code in a sandboxed VM with 5-second timeout.

```json
{
  "taskId": 0,
  "service": {
    "type": "invoke",
    "name": "code-execute",
    "label": "Run Javascript",
    "config": {
      "customFields": true,
      "inputFields": [
        { "type": "code", "name": "code", "label": "Code", "required": true },
        { "type": "text", "name": "items", "label": "items" }
      ]
    }
  },
  "inputData": [
    {
      "name": "code",
      "type": "code",
      "label": "Code",
      "value": "output = items.map(i => i * 2)"
    },
    { "name": "items", "type": "text", "label": "items", "value": [1, 2, 3] }
  ]
}
```

**Result:** `{ outputData: [2, 4, 6] }`

### Baita — Get Todo List

```json
{
  "taskId": 0,
  "app": {
    "name": "Baita",
    "appId": "2d12accb-4b7c-4d22-bdbc-4875a404b929",
    "icon": "/icons/baita.png",
    "config": {}
  },
  "service": {
    "type": "invoke",
    "name": "method-execute",
    "label": "getTodo",
    "config": { "methodName": "getTodo" }
  },
  "inputData": []
}
```

### Baita — Publish Content to Feed

```json
{
  "taskId": 0,
  "app": {
    "name": "Baita",
    "appId": "2d12accb-4b7c-4d22-bdbc-4875a404b929",
    "icon": "/icons/baita.png",
    "config": {}
  },
  "service": {
    "type": "invoke",
    "name": "method-execute",
    "label": "publishToFeed",
    "config": {
      "methodName": "publishToFeed",
      "inputFields": [
        {
          "name": "content",
          "label": "content",
          "type": "output",
          "required": true
        }
      ]
    }
  },
  "inputData": [
    {
      "name": "content",
      "label": "content",
      "type": "output",
      "value": {
        "contentId": "unique-id-123",
        "header": "Article Title",
        "body": "Article description text",
        "source": "###MySource",
        "url": "https://example.com/article"
      }
    }
  ]
}
```

### Google — List Gmail Messages

Requires an OAuth2 connection (appId: `5c16e311-a65a-449c-ad82-1f23a41cf89c`).

```json
{
  "taskId": 0,
  "connectionId": "your-google-connection-id",
  "app": {
    "name": "Google",
    "appId": "5c16e311-a65a-449c-ad82-1f23a41cf89c",
    "icon": "/icons/google.png",
    "config": {
      "apiUrl": "https://www.googleapis.com",
      "auth": {
        "type": "body",
        "method": "post",
        "url": "https://accounts.google.com/o/oauth2/token",
        "headers": { "Content-type": "application/x-www-form-urlencoded" },
        "fields": {
          "username": "GOOGLE_CLIENT_ID",
          "password": "GOOGLE_CLIENT_SECRET"
        }
      }
    }
  },
  "service": {
    "type": "invoke",
    "name": "method-execute",
    "label": "List emails",
    "config": {
      "methodName": "oauth2Request",
      "inputFields": [
        {
          "name": "method",
          "label": "Method",
          "type": "constant",
          "value": "get"
        },
        {
          "name": "path",
          "label": "Path",
          "type": "constant",
          "value": "gmail/v1/users/me/messages"
        },
        {
          "name": "queryParams.maxResults",
          "label": "Max results",
          "type": "text"
        }
      ],
      "outputPath": "messages"
    }
  },
  "inputData": [
    { "name": "method", "label": "Method", "type": "constant", "value": "get" },
    {
      "name": "path",
      "label": "Path",
      "type": "constant",
      "value": "gmail/v1/users/me/messages"
    },
    {
      "name": "queryParams.maxResults",
      "label": "Max results",
      "type": "text",
      "value": "5"
    }
  ]
}
```

### NewsAPI — Get Top Headlines

No connection needed. Server-side API key resolved from `NEWS_API_KEY` env var.

```json
{
  "taskId": 0,
  "app": {
    "name": "NewsAPI",
    "appId": "dcf88373-238e-4335-8ba1-81a81fa73874",
    "icon": "/icons/newsapi.png",
    "config": { "apiUrl": "https://newsapi.org/v2" }
  },
  "service": {
    "type": "invoke",
    "name": "method-execute",
    "label": "Get top headlines",
    "config": {
      "methodName": "httpRequest",
      "inputFields": [
        {
          "name": "method",
          "label": "Method",
          "type": "constant",
          "value": "get"
        },
        {
          "name": "path",
          "label": "Path",
          "type": "constant",
          "value": "top-headlines"
        },
        {
          "name": "headers.X-Api-Key",
          "label": "X-Api-Key",
          "type": "environment",
          "value": "NEWS_API_KEY",
          "required": true
        },
        {
          "name": "queryParams.country",
          "label": "Country",
          "type": "options",
          "required": true
        }
      ],
      "outputPath": "articles",
      "outputMapping": {
        "source": "###NewsAPI",
        "contentId": "publishedAt",
        "header": "title",
        "body": "description",
        "image": "urlToImage",
        "date": "publishedAt",
        "url": "url",
        "author.name": "source.name"
      }
    }
  },
  "inputData": [
    { "name": "method", "label": "Method", "type": "constant", "value": "get" },
    {
      "name": "path",
      "label": "Path",
      "type": "constant",
      "value": "top-headlines"
    },
    {
      "name": "headers.X-Api-Key",
      "label": "X-Api-Key",
      "type": "environment",
      "value": "NEWS_API_KEY"
    },
    {
      "name": "queryParams.country",
      "label": "Country",
      "type": "options",
      "value": "us"
    }
  ]
}
```

### OpenAI — Text Completion

Requires a userApiKey connection (appId: `0f7bb503-b9b4-4fd5-80ab-9a97d52397bb`).

```json
{
  "taskId": 0,
  "connectionId": "your-openai-connection-id",
  "app": {
    "name": "ChatGPT",
    "appId": "0f7bb503-b9b4-4fd5-80ab-9a97d52397bb",
    "icon": "/icons/openai.png",
    "config": {
      "apiUrl": "https://api.openai.com/v1",
      "auth": { "type": "userApiKey", "method": "none", "url": "userApiKey" }
    }
  },
  "service": {
    "type": "invoke",
    "name": "method-execute",
    "label": "Get Text Completion",
    "config": {
      "methodName": "httpRequest",
      "inputFields": [
        {
          "name": "method",
          "label": "Method",
          "type": "constant",
          "value": "post"
        },
        {
          "name": "path",
          "label": "Path",
          "type": "constant",
          "value": "chat/completions"
        },
        {
          "name": "bodyParams.model",
          "label": "Model",
          "type": "constant",
          "value": "gpt-4o-mini"
        },
        {
          "name": "bodyParams.messages.0.role",
          "label": "Role",
          "type": "constant",
          "value": "user"
        },
        {
          "name": "bodyParams.messages.0.content",
          "label": "Prompt",
          "type": "output",
          "required": true
        }
      ],
      "outputPath": "choices.0.message.content"
    }
  },
  "inputData": [
    {
      "name": "method",
      "label": "Method",
      "type": "constant",
      "value": "post"
    },
    {
      "name": "path",
      "label": "Path",
      "type": "constant",
      "value": "chat/completions"
    },
    {
      "name": "bodyParams.model",
      "label": "Model",
      "type": "constant",
      "value": "gpt-4o-mini"
    },
    {
      "name": "bodyParams.messages.0.role",
      "label": "Role",
      "type": "constant",
      "value": "user"
    },
    {
      "name": "bodyParams.messages.0.content",
      "label": "Prompt",
      "type": "output",
      "value": "Say hello"
    }
  ]
}
```

### Pipedrive — Search Person

Requires an OAuth2 connection (appId: `19c1921c-9a6b-4def-91c8-8bcba8239bf5`).

```json
{
  "taskId": 0,
  "connectionId": "your-pipedrive-connection-id",
  "app": {
    "name": "Pipedrive",
    "appId": "19c1921c-9a6b-4def-91c8-8bcba8239bf5",
    "icon": "/icons/pipedrive.png",
    "config": {
      "apiUrl": "https://api.pipedrive.com/v1",
      "auth": {
        "type": "basic",
        "method": "post",
        "url": "https://oauth.pipedrive.com/oauth/token",
        "headers": { "Content-type": "application/x-www-form-urlencoded" },
        "fields": {
          "username": "PIPEDRIVE_CLIENT_ID",
          "password": "PIPEDRIVE_CLIENT_SECRET"
        }
      }
    }
  },
  "service": {
    "type": "invoke",
    "name": "method-execute",
    "label": "Search person",
    "config": {
      "methodName": "oauth2Request",
      "inputFields": [
        {
          "name": "method",
          "label": "Method",
          "type": "constant",
          "value": "get"
        },
        {
          "name": "path",
          "label": "Path",
          "type": "constant",
          "value": "persons/search"
        },
        {
          "name": "queryParams.term",
          "label": "Search term",
          "type": "text",
          "required": true
        },
        { "name": "queryParams.fields", "label": "Field", "type": "text" }
      ],
      "outputPath": "data.items.0.item"
    }
  },
  "inputData": [
    { "name": "method", "label": "Method", "type": "constant", "value": "get" },
    {
      "name": "path",
      "label": "Path",
      "type": "constant",
      "value": "persons/search"
    },
    {
      "name": "queryParams.term",
      "label": "Search term",
      "type": "text",
      "value": "john"
    },
    {
      "name": "queryParams.fields",
      "label": "Field",
      "type": "text",
      "value": "name"
    }
  ]
}
```

---

## Adding a New Connector

1. **Define the connector** in `packages/shared/src/connectors/{name}.ts`
2. **Register it** in `packages/shared/src/connectors/registry.ts`
3. **Add E2E test** in `tests/e2e/tests/connectors/{name}.spec.ts`
4. **Add example** to this document

### E2E Test Template

```typescript
import { expect, test } from '@playwright/test'
import { loadAuthData, logResult } from '../helpers'
import { executeTask, findConnection } from './_helpers'

const APP_ID = 'your-connector-app-id'
let token: string, connectionId: string

test.beforeAll(async ({ request }) => {
  const data = loadAuthData()
  token = data.accessToken
  const conn = await findConnection(request, token, APP_ID)
  connectionId = conn?.connectionId || ''
})

test.describe('MyConnector — Operation Name', () => {
  test('does the thing', async ({ request }) => {
    test.skip(!connectionId, 'No connection available')

    const task = {
      /* build task payload */
    }
    const body = await executeTask(request, token, task)

    expect(body.success).toBe(true)
    expect(body.data.status).toBe('success')
    // Assert on body.data.outputData
  })
})
```

---

## Execution Methods

| Method             | Service Name     | When Used                                              |
| ------------------ | ---------------- | ------------------------------------------------------ |
| `httpRequest`      | `method-execute` | API key auth (NewsAPI, OpenAI with userApiKey)         |
| `oauth2Request`    | `method-execute` | OAuth2 auth (Google, Pipedrive) — auto-refreshes token |
| `getTodo`          | `method-execute` | Built-in: reads user's todo resource                   |
| `publishToFeed`    | `method-execute` | Built-in: publishes content to SQS queue               |
| `sendNotification` | `method-execute` | Built-in: sends web push notification                  |
| —                  | `code-execute`   | JavaScript sandbox execution                           |
| —                  | `trigger-sample` | Stores sample data for trigger step                    |

## Auth Types

| Connector | Auth Type    | How Credentials Are Used                                           |
| --------- | ------------ | ------------------------------------------------------------------ |
| Baita     | `none`       | No credentials needed                                              |
| Google    | `oauth2`     | Refresh token exchanged for access token automatically             |
| Pipedrive | `oauth2`     | Same as Google (different token endpoint)                          |
| OpenAI    | `userApiKey` | API key from connection injected as `Authorization: Bearer` header |
| NewsAPI   | `apiKey`     | Server-side env var injected as `X-Api-Key` header                 |

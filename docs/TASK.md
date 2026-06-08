# Task — Domain Reference

A Task is the atomic unit of execution in Baita. Each Task represents a single operation: it receives input data, invokes a service (Lambda), and produces output data. Tasks can be composed into Bots (ordered arrays of tasks with output chaining), but each Task is independently executable and testable.

## Standalone Execution Endpoint

```
POST /task/execute
Authorization: Bearer <token>
Content-Type: application/json
Body: ITask
```

Returns `{ success: boolean, data: ITaskExecutionResult }`.

No bot required, no DynamoDB writes, no state. Pure execution.

---

## Task Schema (ITask)

| Field              | Type                   | Required | Description                                         |
| ------------------ | ---------------------- | -------- | --------------------------------------------------- |
| `taskId`           | `number`               | Yes      | Unique identifier (typically `Date.now()`)          |
| `app`              | `IApp`                 | No       | The application providing this service              |
| `service`          | `IService`             | No       | Service to execute (required for non-trigger tasks) |
| `inputData`        | `IVariable[]`          | Yes      | Input fields with values or mappings                |
| `returnData`       | `boolean`              | No       | If true, output becomes bot HTTP response body      |
| `sampleResult`     | `ITaskExecutionResult` | No       | Cached test result (set by testBot endpoint)        |
| `sampleConfigHash` | `string`               | No       | Fingerprint to detect stale samples                 |
| `conditions`       | `ITaskCondition[][]`   | No       | Conditional execution (OR-of-ANDs)                  |
| `connectionId`     | `string \| number`     | No       | OAuth/API key connection ID                         |
| `retryPolicy`      | `IRetryPolicy`         | No       | Retry configuration for failures                    |

---

## How Task Execution Works

### Execution Flow

```
1. Input Resolution
   └─ getDataFromService(inputFields, inputData, testData=true)
   └─ Each field resolves its value from sampleValue (test) or value (production)

2. Lambda Invocation
   └─ FunctionName: baita-help-prod-task-{service.name}
   └─ Payload: { userId, botId, connectionId, appConfig, serviceConfig, inputData }

3. Response Parsing
   └─ Success: { success: true, data: <output> }
   └─ Failure: { success: false, message: <error> }

4. Result Assembly
   └─ ITaskExecutionResult: { timestamp, inputData, outputData, status }
```

### Internal Lambda Payload (ITaskExecutionInput)

When the Task controller invokes a service Lambda, it sends:

```json
{
  "userId": "abc123",
  "botId": "standalone",
  "connectionId": "google-conn-1",
  "appConfig": { "apiUrl": "https://api.example.com", "auth": {...} },
  "serviceConfig": { "methodName": "httpRequest", "inputFields": [...] },
  "inputData": { "path": "/users/me", "method": "GET" }
}
```

- `botId: "standalone"` — Fixed string for direct task execution (satisfies schema validation)
- `appConfig` — From `task.app.config` (empty `{}` if no app)
- `serviceConfig` — From `task.service.config`
- `inputData` — Resolved key-value pairs (field name → resolved value)

---

## Available Services

### code-execute

Runs JavaScript code in a sandboxed Node.js VM with a 5-second timeout.

**How it works:**

1. Extracts `code` field and any custom fields from inputData
2. Creates isolated VM context with `{ ...customFields, userId, botId, output: undefined }`
3. Executes code string within context via `vm.runInContext()`
4. Returns whatever the code assigned to the `output` variable

**Input format:**

| Field  | Type   | Required | Description                            |
| ------ | ------ | -------- | -------------------------------------- |
| `code` | `code` | Yes      | JavaScript code to execute             |
| `*`    | any    | No       | Custom variables injected into sandbox |

**Output:** Whatever is assigned to `output` in the code (object, string, number, array).

**Example task:**

```json
{
  "taskId": 1,
  "service": {
    "type": "invoke",
    "name": "code-execute",
    "label": "Run Code",
    "config": {
      "inputFields": [
        { "name": "code", "label": "Code", "type": "code", "required": true }
      ]
    }
  },
  "inputData": [
    {
      "name": "code",
      "label": "Code",
      "type": "code",
      "sampleValue": "output = { greeting: 'Hello from Baita', timestamp: Date.now() }"
    }
  ]
}
```

**Example with custom variables:**

```json
{
  "taskId": 1,
  "service": {
    "type": "invoke",
    "name": "code-execute",
    "label": "Transform Data",
    "config": {
      "inputFields": [
        { "name": "code", "label": "Code", "type": "code", "required": true },
        {
          "name": "items",
          "label": "Items",
          "type": "output",
          "required": true
        }
      ]
    }
  },
  "inputData": [
    {
      "name": "code",
      "label": "Code",
      "type": "code",
      "sampleValue": "output = items.filter(i => i.active).map(i => i.name)"
    },
    {
      "name": "items",
      "label": "Items",
      "type": "output",
      "sampleValue": [
        { "name": "Task A", "active": true },
        { "name": "Task B", "active": false }
      ]
    }
  ]
}
```

---

### method-execute → getTodo

Fetches the user's todo list from DynamoDB.

**How it works:**

1. Reads the `todo` resource for the authenticated user via `Resource.read()`
2. Returns the full todo object from DynamoDB

**Input format:** No inputs required.

**Output:** The todo resource object (or `null` if not found).

**Example task:**

```json
{
  "taskId": 1,
  "service": {
    "type": "invoke",
    "name": "method-execute",
    "label": "Get Todo",
    "config": {
      "methodName": "getTodo",
      "inputFields": []
    }
  },
  "inputData": []
}
```

---

### method-execute → publishToFeed

Publishes content items to the user's SQS feed queue, deduplicating against previously seen items.

**How it works:**

1. Receives `content` field (single IContent or array)
2. Validates content against `ContentSchema`
3. Queries DynamoDB for `#CONTENT#{contentId}` records (previously seen items)
4. Filters out duplicates, limits to 10 new items per batch
5. Sends new items to user's SQS queue (`baita-help-prod-user-{userId}`)
6. Throws if 0 items are new (all duplicates)

**Input format:**

| Field     | Type     | Required | Description                       |
| --------- | -------- | -------- | --------------------------------- |
| `content` | `output` | Yes      | IContent array (see format below) |

**IContent format:**

```json
{
  "contentId": "unique-id",
  "header": "Article Title",
  "body": "Article body or summary text",
  "source": "source-name",
  "date": "2024-01-15T10:00:00Z",
  "author": { "name": "Author Name" },
  "url": "https://example.com/article",
  "image": "https://example.com/image.jpg"
}
```

**Output:** `{ "message": "Published 3 of 5 items to feed." }`

**Example task:**

```json
{
  "taskId": 1,
  "service": {
    "type": "invoke",
    "name": "method-execute",
    "label": "Publish to Feed",
    "config": {
      "methodName": "publishToFeed",
      "inputFields": [
        {
          "name": "content",
          "label": "Content",
          "type": "output",
          "required": true
        }
      ]
    }
  },
  "inputData": [
    {
      "name": "content",
      "label": "Content",
      "type": "output",
      "sampleValue": [
        {
          "contentId": "test-001",
          "header": "Sample Article",
          "body": "This is a test content item",
          "source": "integration-test",
          "date": "2024-06-01T12:00:00Z",
          "author": { "name": "Test" }
        }
      ]
    }
  ]
}
```

---

### method-execute → sendNotification

Sends a Web Push notification via VAPID protocol.

**How it works:**

1. Parses `token` field as JSON → Web Push subscription object
2. Builds notification payload with title, body, icon, badge, actions
3. Sends via `web-push` library with VAPID credentials from environment
4. Returns HTTP status code from push service

**Input format:**

| Field                | Type   | Required | Description                                                          |
| -------------------- | ------ | -------- | -------------------------------------------------------------------- |
| `token`              | `text` | Yes      | JSON string of PushSubscription (`{endpoint, keys: {p256dh, auth}}`) |
| `notification.title` | `text` | Yes      | Notification title                                                   |
| `notification.body`  | `text` | Yes      | Notification body text                                               |
| `notification.image` | `text` | No       | Image URL                                                            |
| `notification.icon`  | `text` | No       | Icon URL (defaults to app logo)                                      |
| `url`                | `text` | No       | Click action URL                                                     |

**Output:** `{ "statusCode": 201, "body": "" }`

**Example task:**

```json
{
  "taskId": 1,
  "service": {
    "type": "invoke",
    "name": "method-execute",
    "label": "Send Notification",
    "config": {
      "methodName": "sendNotification",
      "inputFields": [
        { "name": "token", "label": "Token", "type": "text", "required": true },
        {
          "name": "notification.title",
          "label": "Title",
          "type": "text",
          "required": true
        },
        {
          "name": "notification.body",
          "label": "Body",
          "type": "text",
          "required": true
        }
      ]
    }
  },
  "inputData": [
    {
      "name": "token",
      "label": "Token",
      "type": "text",
      "sampleValue": "{\"endpoint\":\"https://fcm.googleapis.com/fcm/send/...\",\"keys\":{\"p256dh\":\"...\",\"auth\":\"...\"}}"
    },
    {
      "name": "notification.title",
      "label": "Title",
      "type": "text",
      "sampleValue": "New Update"
    },
    {
      "name": "notification.body",
      "label": "Body",
      "type": "text",
      "sampleValue": "Your bot has new results"
    }
  ]
}
```

---

### method-execute → httpRequest

Makes an HTTP request to an external API. Optionally injects API key from a stored connection.

**How it works:**

1. Builds URL from `appConfig.apiUrl + "/" + inputData.path`
2. If `connectionId` is provided and connection has an API key, injects it as a header
3. Executes HTTP request with specified method, headers, body, and query params
4. Optionally extracts data from response using `serviceConfig.outputPath`
5. Optionally remaps response fields using `serviceConfig.outputMapping`

**Input format:**

| Field         | Type   | Required | Description                          |
| ------------- | ------ | -------- | ------------------------------------ |
| `path`        | `text` | Yes      | URL path appended to app's apiUrl    |
| `method`      | `text` | Yes      | HTTP method (GET, POST, PUT, DELETE) |
| `headers`     | `text` | No       | Request headers object               |
| `bodyParams`  | `text` | No       | Request body (for POST/PUT)          |
| `queryParams` | `text` | No       | URL query parameters                 |

**App config required:** `{ "apiUrl": "https://api.example.com" }`

**Connection (optional):** API key connection — the connector's `auth.headerName` receives the key.

**Output:** Response body (or extracted/mapped subset via serviceConfig).

**Example task:**

```json
{
  "taskId": 1,
  "app": {
    "name": "Example API",
    "appId": "example-api",
    "config": { "apiUrl": "https://jsonplaceholder.typicode.com" }
  },
  "service": {
    "type": "invoke",
    "name": "method-execute",
    "label": "HTTP Request",
    "config": {
      "methodName": "httpRequest",
      "inputFields": [
        { "name": "path", "label": "Path", "type": "text", "required": true },
        {
          "name": "method",
          "label": "Method",
          "type": "text",
          "required": true
        }
      ]
    }
  },
  "inputData": [
    {
      "name": "path",
      "label": "Path",
      "type": "text",
      "sampleValue": "posts/1"
    },
    {
      "name": "method",
      "label": "Method",
      "type": "text",
      "sampleValue": "GET"
    }
  ]
}
```

---

### method-execute → oauth2Request

Makes an authenticated HTTP request using OAuth2. Automatically refreshes the access token before the request.

**How it works:**

1. Reads connection credentials from DynamoDB (`refresh_token` required)
2. Calls the app's token refresh endpoint (`appConfig.auth.url`) with:
   - `grant_type: "refresh_token"`
   - `refresh_token` from stored credentials
   - Client ID/secret from environment (if auth type is `body` or `basic`)
3. Updates stored credentials with new access token (and new refresh token if rotated)
4. Makes the actual HTTP request with `Authorization: Bearer <new_access_token>`
5. Returns response body (optionally extracted/mapped via serviceConfig)

**Input format:** Same as httpRequest (path, method, headers, bodyParams, queryParams).

**Additional requirements:**

- `connectionId` — **Required**. Must reference an OAuth connection with `credentials.refresh_token`
- `app.config.auth` — **Required**. Token refresh configuration:
  - `auth.url` — Token endpoint URL
  - `auth.method` — HTTP method for token request
  - `auth.type` — `"basic"` (HTTP Basic) or `"body"` (credentials in body)
  - `auth.headers` — Headers for token request (e.g., Content-Type)
  - `auth.fields` — `{ username, password }` — env var names for client_id/secret

**Output:** Response body from the authenticated API call.

**Example task:**

```json
{
  "taskId": 1,
  "app": {
    "name": "Google",
    "appId": "google",
    "config": {
      "apiUrl": "https://gmail.googleapis.com/gmail/v1",
      "auth": {
        "type": "body",
        "method": "POST",
        "url": "https://oauth2.googleapis.com/token",
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
    "label": "OAuth2 Request",
    "config": {
      "methodName": "oauth2Request",
      "inputFields": [
        { "name": "path", "label": "Path", "type": "text", "required": true },
        {
          "name": "method",
          "label": "Method",
          "type": "text",
          "required": true
        }
      ]
    }
  },
  "inputData": [
    {
      "name": "path",
      "label": "Path",
      "type": "text",
      "sampleValue": "users/me/messages?maxResults=5"
    },
    {
      "name": "method",
      "label": "Method",
      "type": "text",
      "sampleValue": "GET"
    }
  ],
  "connectionId": "google-connection-id"
}
```

---

## Variable Types

Each field in `inputData` has a `type` that determines how its value is resolved:

| Type          | Resolution                                   | Description                            |
| ------------- | -------------------------------------------- | -------------------------------------- |
| `code`        | `sampleValue` (test) / `value` (prod)        | JavaScript code string                 |
| `text`        | `sampleValue` (test) / `value` (prod)        | Free-form text input                   |
| `user`        | `sampleValue` (test) / `value` (prod)        | User-provided value                    |
| `output`      | `sampleValue` (test) / runtime output (prod) | References output from a previous task |
| `options`     | `sampleValue` (test) / `value` (prod)        | Selection from predefined options      |
| `boolean`     | `sampleValue` (test) / `value` (prod)        | True/false toggle                      |
| `constant`    | `value` always                               | Fixed value, never changes             |
| `environment` | `value` always                               | References environment variable        |

In test mode (standalone execution), **`sampleValue` is always used**. This means every field that needs a value must have `sampleValue` set.

In production (deployed bot), output-type variables resolve from the actual output of the referenced task at runtime.

---

## Output Chaining (output type variables)

When a variable has `type: "output"`, it references output from a previous task:

```json
{
  "name": "articles",
  "type": "output",
  "outputIndex": 0,
  "outputPath": "data.articles",
  "sampleValue": [{ "title": "Test" }]
}
```

- `outputIndex` — Index of the referenced task in the bot's task array
- `outputPath` — Dot-notation path to extract from that task's output
- `sampleValue` — Test value used during standalone execution and UI preview

---

## Conditions

Tasks can have conditional execution via `conditions: ITaskCondition[][]`.

Structure is **OR-of-ANDs**: the outer array is OR groups, the inner array is AND conditions within each group. The task executes if ANY outer group has ALL its conditions met.

```json
{
  "conditions": [
    [
      {
        "operator": "contains",
        "operand": {
          "name": "title",
          "type": "output",
          "outputIndex": 0,
          "outputPath": "title"
        },
        "comparisonOperand": {
          "name": "keyword",
          "type": "text",
          "value": "important"
        }
      }
    ]
  ]
}
```

**Operators:** `equals`, `not-equals`, `exists`, `does-not-exist`, `contains`, `starts-with`, `ends-with`

---

## Retry Policy

Optional per-task retry configuration for handling transient failures:

```json
{
  "retryPolicy": {
    "maxAttempts": 3,
    "backoffMs": 2000
  }
}
```

- `maxAttempts` — 1 to 5 (default: 1 = no retry)
- `backoffMs` — Base delay between retries in ms, 100 to 60000 (default: 1000)

Deployed bots use exponential backoff: delay = `backoffMs * 2^attempt`.

---

## Validation Functions

### validateBot(bot)

Validates all tasks in a bot for correctness. Returns `{ valid: boolean, errors: string[], warnings: string[] }`.

**Checks:**

- Non-trigger tasks must have a service configured
- Output references must point to earlier steps (no forward references)
- Output references must point to existing steps (no out-of-bounds)
- Output paths are validated against sample data (warning if path not found)
- Required input fields must have values
- Stale sample detection via config hash comparison

### computeStepConfigHash(task)

Fingerprints a task's service name + input field names/types. Used to detect when test data becomes stale after configuration changes.

### removeStepReferences(tasks, deletedTaskId)

Called when a task is deleted from a bot. Removes the task and:

- Clears output references that pointed to the deleted task
- Adjusts `outputIndex` for tasks that referenced steps after the deleted one

Returns `{ tasks, removedCount }`.

### clearDownstreamSamples(tasks, changedIndex)

Invalidates `sampleResult` and `sampleConfigHash` for tasks downstream of `changedIndex` that reference it via output variables.

### getTaskLabel(index)

Returns `"Trigger"` for index 0, `"Task N"` for any other index.

---

## Integration Test Examples

### code-execute (no external dependencies)

```bash
curl -X POST https://api.baita.help/task/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": 1,
    "service": {
      "type": "invoke",
      "name": "code-execute",
      "label": "Run Code",
      "config": { "inputFields": [{"name":"code","label":"Code","type":"code","required":true}] }
    },
    "inputData": [
      {"name":"code","label":"Code","type":"code","sampleValue":"output = { result: 42, timestamp: Date.now() }"}
    ]
  }'
```

### getTodo

```bash
curl -X POST https://api.baita.help/task/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": 1,
    "service": {
      "type": "invoke",
      "name": "method-execute",
      "label": "Get Todo",
      "config": { "methodName": "getTodo", "inputFields": [] }
    },
    "inputData": []
  }'
```

### httpRequest (public API, no connection needed)

```bash
curl -X POST https://api.baita.help/task/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": 1,
    "app": {
      "name": "JSONPlaceholder",
      "appId": "jsonplaceholder",
      "config": { "apiUrl": "https://jsonplaceholder.typicode.com" }
    },
    "service": {
      "type": "invoke",
      "name": "method-execute",
      "label": "HTTP Request",
      "config": {
        "methodName": "httpRequest",
        "inputFields": [
          {"name":"path","label":"Path","type":"text","required":true},
          {"name":"method","label":"Method","type":"text","required":true}
        ]
      }
    },
    "inputData": [
      {"name":"path","label":"Path","type":"text","sampleValue":"posts/1"},
      {"name":"method","label":"Method","type":"text","sampleValue":"GET"}
    ]
  }'
```

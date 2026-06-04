# Partner Integration Guide

This document explains how to add new partner integrations to Baita — external APIs/services that users can connect to their bots (e.g., Google, Pipedrive, Slack, GitHub).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Connector Manifest (packages/shared/src/connectors/)        │
│ - Declares: auth type, endpoints, operations, fields        │
│ - Single source of truth per partner                         │
└─────────────┬───────────────────────────────────────────────┘
              │ used by
    ┌─────────┴──────────────────────────────┐
    │                                         │
    ▼                                         ▼
┌──────────────────┐              ┌──────────────────────────┐
│ Frontend UI      │              │ Backend OAuth Handler     │
│ - Service picker │              │ - GET /connectors/oauth   │
│ - Connection     │              │ - Exchanges auth code     │
│   management     │              │ - Stores credentials      │
└──────────────────┘              └──────────────────────────┘
                                              │
                                              ▼
                                  ┌──────────────────────────┐
                                  │ Task Execution            │
                                  │ - Reads connection creds  │
                                  │ - Refreshes token         │
                                  │ - Makes API call          │
                                  │ - Persists new token      │
                                  └──────────────────────────┘
```

## Adding a New Partner (Step by Step)

### 1. Create the Connector Manifest

Create a new file in `packages/shared/src/connectors/{partner-name}.ts`:

```typescript
import { VariableType } from '../schemas/service'
import { ConnectorManifest } from './index'

export const slackConnector: ConnectorManifest = {
  id: 'slack',
  name: 'Slack',
  icon: 'slack',
  category: 'Communication',
  auth: {
    type: 'oauth2',
    authorizationUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:read'],
    userInfoUrl: 'https://slack.com/api/auth.test',
    userIdField: 'user_id',
    clientIdEnvVar: 'SLACK_CLIENT_ID',
    clientSecretEnvVar: 'SLACK_CLIENT_SECRET',
    tokenAuthMethod: 'body',
  },
  base: { url: 'https://slack.com/api' },
  healthCheck: { url: '/auth.test', method: 'POST' },
  operations: [
    {
      id: 'send-message',
      name: 'Send Message',
      description: 'Send a message to a Slack channel',
      method: 'POST',
      path: '/chat.postMessage',
      inputFields: [
        {
          type: VariableType.text,
          name: 'channel',
          label: 'Channel ID',
          required: true,
        },
        {
          type: VariableType.text,
          name: 'text',
          label: 'Message Text',
          required: true,
        },
      ],
    },
  ],
}
```

### 2. Export from Package

Add to `packages/shared/src/index.ts`:

```typescript
export { slackConnector } from './connectors/slack'
```

### 3. Store OAuth Secrets in AWS SSM

```bash
aws ssm put-parameter --profile baita --region us-east-1 \
  --name "/baita/prod/slack-client-id" --value "<your-client-id>" \
  --type SecureString

aws ssm put-parameter --profile baita --region us-east-1 \
  --name "/baita/prod/slack-client-secret" --value "<your-client-secret>" \
  --type SecureString
```

### 4. Add Environment Variables to serverless.yml

In `apps/backend/serverless.yml`, under `provider.environment`:

```yaml
SLACK_CLIENT_ID: ${ssm:/baita/prod/slack-client-id}
SLACK_CLIENT_SECRET: ${ssm:/baita/prod/slack-client-secret}
```

### 5. Register in Connector Registry

Add to `packages/shared/src/connectors/registry.ts`:

```typescript
import { slackConnector } from './slack'

// Add to the connectors array
const connectors: ConnectorManifest[] = [
  pipedriveConnector,
  googleConnector,
  slackConnector,
]

// Add to APP_ID_MAP (map your frontend appId UUID to connector id)
const APP_ID_MAP: Record<string, string> = {
  // ... existing entries
  'your-new-uuid': 'slack',
}
```

### 6. Register in Frontend (Optional — for bot builder)

Add to `apps/frontend/src/defines/apps.ts` if the connector should appear in the bot builder.
The Connections page automatically picks up all connectors from the shared registry.

### 7. Configure OAuth Redirect URL

In the partner's developer dashboard (e.g., api.slack.com), set the OAuth redirect URL to:

```
https://api.baita.help/connectors/oauth
```

### 8. Deploy and Test

```bash
cd apps/backend && npm run deploy
```

Then test:

1. Open the bot builder
2. Add a task with the new service
3. Click "New Connection" → OAuth popup opens
4. Authorize → connection saved
5. Test the task → API call succeeds

---

## OAuth 2.0 Configuration Per Provider

| Provider  | Create App URL                                    | Redirect URL                              | Notes                         |
| --------- | ------------------------------------------------- | ----------------------------------------- | ----------------------------- |
| Google    | https://console.cloud.google.com/apis/credentials | `https://api.baita.help/connectors/oauth` | Enable APIs in console first  |
| Pipedrive | https://developers.pipedrive.com/                 | `https://api.baita.help/connectors/oauth` |                               |
| Slack     | https://api.slack.com/apps                        | `https://api.baita.help/connectors/oauth` | Use "OAuth & Permissions" tab |
| GitHub    | https://github.com/settings/developers            | `https://api.baita.help/connectors/oauth` |                               |
| Notion    | https://www.notion.so/my-integrations             | `https://api.baita.help/connectors/oauth` | Public integration type       |

---

## Connector Manifest Schema Reference

| Field                      | Type                           | Required | Description                                                      |
| -------------------------- | ------------------------------ | -------- | ---------------------------------------------------------------- |
| `id`                       | string                         | Yes      | Unique identifier (kebab-case)                                   |
| `name`                     | string                         | Yes      | Display name                                                     |
| `icon`                     | string                         | No       | Icon identifier                                                  |
| `category`                 | string                         | Yes      | Grouping category                                                |
| `auth.type`                | 'oauth2' \| 'apiKey' \| 'none' | Yes      | Authentication method                                            |
| `auth.authorizationUrl`    | string                         | OAuth2   | Provider's authorize endpoint                                    |
| `auth.tokenUrl`            | string                         | OAuth2   | Token exchange endpoint                                          |
| `auth.refreshUrl`          | string                         | No       | Token refresh endpoint (defaults to tokenUrl)                    |
| `auth.scopes`              | string[]                       | OAuth2   | Required permissions                                             |
| `auth.userInfoUrl`         | string                         | OAuth2   | Endpoint to fetch user identity                                  |
| `auth.userIdField`         | string                         | OAuth2   | JSON path to user ID in userInfo response                        |
| `auth.clientIdEnvVar`      | string                         | OAuth2   | Environment variable name for client ID                          |
| `auth.clientSecretEnvVar`  | string                         | OAuth2   | Environment variable name for client secret                      |
| `auth.tokenAuthMethod`     | 'basic' \| 'body'              | No       | How credentials are sent during token exchange (default: 'body') |
| `base.url`                 | string                         | Yes      | Base URL for all API calls                                       |
| `healthCheck.url`          | string                         | No       | Endpoint to verify connection is alive                           |
| `operations[].id`          | string                         | Yes      | Unique operation ID                                              |
| `operations[].name`        | string                         | Yes      | Display name                                                     |
| `operations[].method`      | string                         | Yes      | HTTP method                                                      |
| `operations[].path`        | string                         | Yes      | API path (appended to base.url)                                  |
| `operations[].inputFields` | IVariable[]                    | Yes      | Input parameters                                                 |
| `operations[].outputPath`  | string                         | No       | JSON path to extract from response                               |

---

## Troubleshooting

### "No refresh token" error

- The OAuth provider didn't return a refresh_token
- For Google: add `access_type=offline&prompt=consent` to authorizationUrl
- For Pipedrive: refresh tokens are always returned

### Token refresh fails (401)

- The refresh token may have expired or been revoked
- User needs to reconnect (delete connection + create new one)
- Check CloudWatch logs for the exact error

### "Invalid redirect_uri" on OAuth

- Ensure the redirect URL in the provider's app matches exactly: `https://api.baita.help/connectors/oauth`
- No trailing slash, HTTPS only

### Connection works in test but fails in deployed bot

- Check that the Lambda has the environment variables (deploy after adding to serverless.yml)
- Verify the connection credentials in DynamoDB aren't stale

### "redirect_uri_mismatch" on OAuth callback

The `redirect_uri` must match EXACTLY in three places:

1. **Frontend** `authorizeUrl` parameter in `apps/frontend/src/defines/apps.ts`
2. **Backend** `redirect_uri` sent during token exchange (in the connector handler)
3. **Provider dashboard** registered redirect URI (Google Cloud Console, Pipedrive, etc.)

If ANY mismatch, the provider rejects the token exchange silently.

**All partners** use the generic callback URL: `https://api.baita.help/connectors/oauth`. Register this exact URL in each provider's OAuth app dashboard.

---

## Architecture: Two Auth Systems

There are **two separate systems** handling OAuth for a partner — understand both:

### 1. Initial Connection (Connector Manifest)

When a user clicks "New Connection", the **connector manifest** (`packages/shared/src/connectors/{partner}.ts`) drives:

- Authorization URL construction (frontend builds the popup URL)
- Token exchange (backend handler at `apps/backend/src/connectors/oauth/index.ts`)
- User info fetching and connection storage

The `tokenAuthMethod` field in the manifest controls how `client_id`/`client_secret` are sent during the initial code-for-tokens exchange:

- `'body'` (default) — credentials in POST body as form fields
- `'basic'` — credentials as `Authorization: Basic base64(id:secret)` header

### 2. Token Refresh During Bot Execution (App Config)

When a deployed bot runs a task using the connection, the **app config** from `apps/frontend/src/defines/apps.ts` (serialized into the bot's task JSON) drives:

- Token refresh before each API call
- Auth method for refresh (`config.auth.type`: `'basic'` or `'body'`)
- Bearer token injection into the actual API request

**Both systems must agree** on how to authenticate with the provider's token endpoint. If the manifest says `tokenAuthMethod: 'basic'`, the frontend app config `auth.type` must also be `'basic'`.

### Token Auth Methods by Provider

| Provider  | Token Exchange | Token Refresh | Notes                       |
| --------- | -------------- | ------------- | --------------------------- |
| Google    | body           | body          | Standard OAuth2 body params |
| Pipedrive | basic          | basic         | Requires Basic auth header  |

---

## Testing a New Partner

After integrating a new partner, verify these flows:

1. **Unit tests** — OAuth handler + token refresh (`apps/backend/src/connectors/oauth/tests/`)
2. **E2E tests** — Connection CRUD with partner-specific credential shape (`tests/e2e/tests/connector-oauth.spec.ts`)
3. **Manual test** — Open bot builder → add task → click "New Connection" → authorize → verify connection saved
4. **Bot execution test** — Deploy a bot with the partner task → run it → verify API call succeeds with refreshed token

---

## AI-Assisted Connector Generation

You can use an AI assistant (Claude, Copilot) to generate a new connector manifest from API documentation.

### Template File

A ready-to-copy template exists at `packages/shared/src/connectors/_template.ts` with all fields documented.

### Prompt for AI

Give your AI assistant this prompt along with the partner's API documentation:

```
I need to create a new connector manifest for Baita.

Here's the template structure I need to fill:
- File: packages/shared/src/connectors/{partner}.ts
- Must export a ConnectorManifest object
- Must validate against ConnectorManifestSchema from ./index

Requirements:
1. id: lowercase kebab-case partner name
2. auth: OAuth2 config with all URLs, scopes, and env var names
3. healthCheck: a lightweight GET endpoint that returns 200 if auth is valid
4. operations: the top 3-5 most useful API operations with typed inputFields
5. base.url: the API base URL

The partner API docs are: [paste URL or content]

Please generate the TypeScript file following the pattern in _template.ts.
After generating, I need to:
1. Export from packages/shared/src/index.ts
2. Register in packages/shared/src/connectors/registry.ts
3. Add UUID→connectorId mapping in registry.ts APP_ID_MAP
4. Store OAuth secrets in AWS SSM
5. Add env vars to serverless.yml
6. Deploy
```

### Validation

After generating, validate the manifest compiles:

```bash
cd packages/shared && npx tsc --noEmit
```

And optionally test in a Node REPL:

```typescript
import { ConnectorManifestSchema } from './src/connectors/index'
import { newConnector } from './src/connectors/your-connector'

ConnectorManifestSchema.parse(newConnector) // throws if invalid
```

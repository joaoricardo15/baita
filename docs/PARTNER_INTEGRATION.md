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
aws ssm put-parameter --profile joao --region us-east-1 \
  --name "/baita/prod/slack-client-id" --value "<your-client-id>" \
  --type SecureString

aws ssm put-parameter --profile joao --region us-east-1 \
  --name "/baita/prod/slack-client-secret" --value "<your-client-secret>" \
  --type SecureString
```

### 4. Add Environment Variables to serverless.yml

In `apps/backend/serverless.yml`, under `provider.environment`:

```yaml
SLACK_CLIENT_ID: ${ssm:/baita/prod/slack-client-id}
SLACK_CLIENT_SECRET: ${ssm:/baita/prod/slack-client-secret}
```

### 5. Register in Frontend

Add to `apps/frontend/src/defines/apps.ts` (or use the manifest-driven approach once implemented):

```typescript
import { slackConnector } from '@baita/shared'
// Add to the apps array using the manifest data
```

### 6. Configure OAuth Redirect URL

In the partner's developer dashboard (e.g., api.slack.com), set the OAuth redirect URL to:

```
https://api.baita.help/connectors/oauth
```

### 7. Deploy and Test

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

| Field                      | Type                           | Required | Description                                   |
| -------------------------- | ------------------------------ | -------- | --------------------------------------------- |
| `id`                       | string                         | Yes      | Unique identifier (kebab-case)                |
| `name`                     | string                         | Yes      | Display name                                  |
| `icon`                     | string                         | No       | Icon identifier                               |
| `category`                 | string                         | Yes      | Grouping category                             |
| `auth.type`                | 'oauth2' \| 'apiKey' \| 'none' | Yes      | Authentication method                         |
| `auth.authorizationUrl`    | string                         | OAuth2   | Provider's authorize endpoint                 |
| `auth.tokenUrl`            | string                         | OAuth2   | Token exchange endpoint                       |
| `auth.refreshUrl`          | string                         | No       | Token refresh endpoint (defaults to tokenUrl) |
| `auth.scopes`              | string[]                       | OAuth2   | Required permissions                          |
| `auth.userInfoUrl`         | string                         | OAuth2   | Endpoint to fetch user identity               |
| `auth.userIdField`         | string                         | OAuth2   | JSON path to user ID in userInfo response     |
| `auth.clientIdEnvVar`      | string                         | OAuth2   | Environment variable name for client ID       |
| `auth.clientSecretEnvVar`  | string                         | OAuth2   | Environment variable name for client secret   |
| `base.url`                 | string                         | Yes      | Base URL for all API calls                    |
| `healthCheck.url`          | string                         | No       | Endpoint to verify connection is alive        |
| `operations[].id`          | string                         | Yes      | Unique operation ID                           |
| `operations[].name`        | string                         | Yes      | Display name                                  |
| `operations[].method`      | string                         | Yes      | HTTP method                                   |
| `operations[].path`        | string                         | Yes      | API path (appended to base.url)               |
| `operations[].inputFields` | IVariable[]                    | Yes      | Input parameters                              |
| `operations[].outputPath`  | string                         | No       | JSON path to extract from response            |

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

# AI Partner Integration Guide

Instructions for AI assistants (Claude, etc.) helping developers add new partner integrations to Baita.

## Your Role

When a developer asks to integrate a new partner (e.g., "add Slack integration"), follow these steps exactly:

## Step-by-Step Process

### 1. Gather Requirements

Ask the developer:

- What API are we integrating? (name, docs URL)
- What auth type? (OAuth2, API key, none)
- What operations should be available? (e.g., "send message", "list items", "create record")

### 2. Research the Partner's API

- Find the OAuth 2.0 documentation (authorization URL, token URL, scopes)
- Find the API base URL
- Find the user info endpoint (to identify the connected account)
- Identify the operations the developer wants

### 3. Create the Connector Manifest

Create `packages/shared/src/connectors/{partner}.ts`:

```typescript
import { VariableType } from '../schemas/service'
import { ConnectorManifest } from './index'

export const {partner}Connector: ConnectorManifest = {
  id: '{partner}',
  name: '{Partner Name}',
  icon: '{partner}',
  category: '{Category}',
  auth: {
    type: 'oauth2',
    authorizationUrl: '{from API docs}',
    tokenUrl: '{from API docs}',
    refreshUrl: '{from API docs, or same as tokenUrl}',
    scopes: ['{required scopes}'],
    userInfoUrl: '{endpoint that returns user identity}',
    userIdField: '{json path to unique user ID in response}',
    clientIdEnvVar: '{PARTNER}_CLIENT_ID',
    clientSecretEnvVar: '{PARTNER}_CLIENT_SECRET',
  },
  base: { url: '{API base URL}' },
  healthCheck: { url: '{simple GET endpoint}', method: 'GET' },
  operations: [
    // Add one per API operation
  ],
}
```

### 4. Export from Package

Add to `packages/shared/src/index.ts`:

```typescript
export { {partner}Connector } from './connectors/{partner}'
```

### 5. Store Secrets

Run these commands (replace values):

```bash
aws ssm put-parameter --profile joao --region us-east-1 \
  --name "/baita/prod/{partner}-client-id" --value "{CLIENT_ID}" \
  --type SecureString

aws ssm put-parameter --profile joao --region us-east-1 \
  --name "/baita/prod/{partner}-client-secret" --value "{CLIENT_SECRET}" \
  --type SecureString
```

### 6. Add Environment Variables

In `apps/backend/serverless.yml` under `provider.environment`:

```yaml
{PARTNER}_CLIENT_ID: ${ssm:/baita/prod/{partner}-client-id}
{PARTNER}_CLIENT_SECRET: ${ssm:/baita/prod/{partner}-client-secret}
```

### 7. Verify

1. `cd packages/shared && npx tsc --noEmit` → passes
2. `cd apps/backend && npx tsc --noEmit` → passes
3. Deploy: `cd apps/backend && npm run deploy`
4. Test OAuth flow in browser
5. Test task execution via bot builder

## Important Notes

- The redirect URL for ALL partners is: `https://api.baita.help/connectors/oauth`
- Configure this in the partner's developer dashboard
- For Google APIs: enable the specific API in Google Cloud Console before using
- All secrets go in AWS SSM under `/baita/prod/` prefix
- Environment variable names in serverless.yml must match `clientIdEnvVar`/`clientSecretEnvVar` in the manifest
- The `userIdField` supports dot notation (e.g., `data.user.id` for nested responses)

## Common Partner OAuth Details

### Google

- Console: https://console.cloud.google.com/apis/credentials
- authorizationUrl: `https://accounts.google.com/o/oauth2/auth`
- tokenUrl: `https://accounts.google.com/o/oauth2/token`
- Add `access_type=offline&prompt=consent` to get refresh_token

### Slack

- Console: https://api.slack.com/apps
- authorizationUrl: `https://slack.com/oauth/v2/authorize`
- tokenUrl: `https://slack.com/api/oauth.v2.access`
- userInfoUrl: `https://slack.com/api/auth.test`

### GitHub

- Console: https://github.com/settings/developers
- authorizationUrl: `https://github.com/login/oauth/authorize`
- tokenUrl: `https://github.com/login/oauth/access_token`
- userInfoUrl: `https://api.github.com/user`
- Note: GitHub tokens don't expire (no refresh needed)

### Notion

- Console: https://www.notion.so/my-integrations
- authorizationUrl: `https://api.notion.com/v1/oauth/authorize`
- tokenUrl: `https://api.notion.com/v1/oauth/token`
- userInfoUrl: `https://api.notion.com/v1/users/me`

### Spotify

- Console: https://developer.spotify.com/dashboard
- authorizationUrl: `https://accounts.spotify.com/authorize`
- tokenUrl: `https://accounts.spotify.com/api/token`
- userInfoUrl: `https://api.spotify.com/v1/me`

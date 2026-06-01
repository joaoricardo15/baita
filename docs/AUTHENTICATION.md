# Authentication & Connections

Baita has two distinct authentication systems that serve different purposes:

## 1. User Authentication (Baita Login)

**Purpose**: Users logging into Baita itself to use the platform.

**Flow**:

```
User clicks "Log in" → Auth0 Universal Login → Google/Email auth →
Auth0 callback → App receives JWT → API calls with Bearer token
```

**Components**:

- **Provider**: Auth0 (`@auth0/auth0-react`)
- **Domain**: `auth.baita.help` (custom domain, tenant: `dev-yc4pbydg`)
- **Frontend**: `apps/frontend/src/index.tsx` (Auth0Provider config)
- **Backend**: `apps/backend/src/authorizer/index.ts` (JWT verification)
- **Token storage**: localStorage (via Auth0 SDK `cacheLocation: 'localstorage'`)
- **Refresh**: `useRefreshTokens: true` (rotating refresh tokens)

**Configuration**:

- Client ID: `Pq5VTtkIhUSfe9bqkoPsLvGCw1JBNf4c`
- Custom domain: `auth.baita.help`
- Callback URLs: `https://www.baita.help`, `http://localhost:3000`
- E2E testing: real Auth0 login via Playwright (test user: `test@baita.help`)

**Key behaviors**:

- `onRedirectCallback` cleans URL params after auth
- Service worker passes through `?code=` and `?error=` callbacks (doesn't cache)
- Authorizer returns wildcard IAM policy (all endpoints) for cached token efficiency

---

## 2. OAuth Connector Authentication (Partner Connections)

**Purpose**: Users connecting their 3rd-party accounts (Google, Pipedrive, etc.) so bots can access their data.

**Flow**:

```
User clicks "New Connection" in bot builder → OAuth popup opens →
Provider login page → User grants permissions → Provider redirects to
/connectors/oauth?code=X&state=Y → Backend exchanges code for tokens →
Credentials stored in DynamoDB → Connection linked to bot task
```

**Components**:

- **Handler**: `apps/backend/src/connectors/oauth/index.ts` (generic, manifest-driven)
- **Registry**: `apps/backend/src/connectors/oauth/registry.ts`
- **Manifests**: `packages/shared/src/connectors/` (Google, Pipedrive)
- **Frontend**: `apps/frontend/src/views/bot/components/service/newConnection.tsx`
- **Token storage**: DynamoDB (`#CONNECTION#{connectionId}`)

**State parameter format** (encoded in OAuth redirect):

```
{appId}:{userId}:{botId}:{taskIndex}:{connectorId}
```

**Token lifecycle**:

1. **Initial grant**: Auth code exchanged for access_token + refresh_token
2. **Storage**: Full credentials saved to DynamoDB connection record
3. **Runtime refresh**: Before each API call, refresh_token → new access_token
4. **Persistence**: Refreshed tokens saved back to DynamoDB (prevents stale tokens)
5. **Expiry**: If refresh_token expires, user must reconnect

**Adding new partners**: See `docs/PARTNER_INTEGRATION.md`

---

## E2E Test Coverage

| Flow           | Test File                                     | Tests | What's Verified                                                      |
| -------------- | --------------------------------------------- | ----- | -------------------------------------------------------------------- |
| User Auth      | `tests/e2e/tests/auth-and-connectors.spec.ts` | 12    | Login button, Auth0 redirect, callback handling, SW bypass, API auth |
| Connector Auth | `tests/e2e/tests/auth-and-connectors.spec.ts` | 10    | Connection CRUD, token persistence, OAuth endpoint, error handling   |
| API Health     | `tests/e2e/tests/api-health.spec.ts`          | 18    | All endpoints, bot lifecycle, security                               |

---

## Security Considerations

- **User auth tokens**: Never stored in code, managed by Auth0 SDK
- **Connector tokens**: Stored encrypted-at-rest in DynamoDB
- **OAuth state**: Encodes context (no HMAC yet — future improvement)
- **CORS**: Gateway-level headers on all 4XX/5XX responses

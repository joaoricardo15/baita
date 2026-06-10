# Auth0 Infrastructure as Code

Manages the Baita Auth0 tenant configuration using [auth0-deploy-cli](https://github.com/auth0/auth0-deploy-cli).

## Structure

```
infra/auth0/
├── README.md                              # This file
├── tenant.yaml                            # Full tenant configuration
└── actions/
    └── post-login-provision/
        └── code.js                        # Post-Login Action code
```

## What's Declared

| Resource     | Name                       | Purpose                              |
| ------------ | -------------------------- | ------------------------------------ |
| SPA Client   | Baita Web App              | Frontend React app (auth.baita.help) |
| M2M Client   | Baita M2M                  | Backend user deletion + deploy-cli   |
| Database     | baita-users                | Email/password authentication        |
| Social       | google-oauth2              | Google login                         |
| Action       | Provision Baita User       | Create DynamoDB user on first login  |
| Client Grant | Baita M2M → Management API | Scopes for deletion + deploy         |

## CI/CD Pipeline

Auth0 configuration is deployed automatically in the CI pipeline (`.github/workflows/ci.yml`) after the backend deploys. This ensures the Action's API endpoint is always available before the Action is updated.

### Required GitHub Secrets

Add these to the repo's GitHub Secrets (Settings > Secrets > Actions):

| Secret                       | Value                   | How to get it                                                         |
| ---------------------------- | ----------------------- | --------------------------------------------------------------------- |
| `AUTH0_DEPLOY_CLIENT_ID`     | Baita M2M client ID     | Auth0 Dashboard > Applications > Baita M2M > Settings > Client ID     |
| `AUTH0_DEPLOY_CLIENT_SECRET` | Baita M2M client secret | Auth0 Dashboard > Applications > Baita M2M > Settings > Client Secret |

The domain (`auth.baita.help`) is hardcoded in the workflow — it's public, not a secret.

## M2M Permissions Required

The Baita M2M application needs these scopes granted on the Auth0 Management API:

**For user deletion (existing):**

- `delete:users`

**For deploy-cli (new — add these):**

- `read:actions`, `create:actions`, `update:actions`, `delete:actions`
- `read:clients`, `update:clients`
- `read:connections`, `update:connections`
- `read:resource_servers`
- `read:client_grants`, `create:client_grants`, `update:client_grants`
- `read:tenant_settings`

To grant these:

1. Go to Auth0 Dashboard > Applications > APIs > Auth0 Management API
2. Click "Machine to Machine Applications" tab
3. Find "Baita M2M" and expand it
4. Check the scopes listed above
5. Click "Update"

## Local Usage

### Prerequisites

```bash
npm install -g auth0-deploy-cli
```

### Environment Variables

```bash
export AUTH0_DOMAIN=dev-yc4pbydg.us.auth0.com
export AUTH0_CLIENT_ID=<baita-m2m-client-id>
export AUTH0_CLIENT_SECRET=<baita-m2m-client-secret>
```

### Export current tenant config (to refresh local state)

```bash
cd infra/auth0
a0deploy export --format=yaml --output_folder=.
```

### Import (apply changes from repo to Auth0)

```bash
cd infra/auth0
a0deploy import --input_file=tenant.yaml
```

### Workflow

1. Edit `tenant.yaml` or action code files in this directory
2. Test locally: `a0deploy import --input_file=tenant.yaml`
3. Verify in Auth0 Dashboard
4. Commit and push — CI will deploy it automatically

## Secret Management

Secret VALUES are never stored in this repo. The `tenant.yaml` declares secret names only.
Actual secret values are managed in:

- Auth0 Dashboard > Actions > [Action] > Secrets tab
- Or via environment variables during `a0deploy import`

## Actions

### Provision Baita User (Post-Login)

Fires on every login. Creates a user record in DynamoDB on first login using `app_metadata.provisioned` flag for idempotency and retry semantics.

Key design decisions:

- Uses `app_metadata.provisioned` (not `logins_count`) for retry on failure
- Parses JSON response body (API returns HTTP 200 always, success is in body)
- Non-blocking: login always succeeds even if provisioning fails

See `actions/post-login-provision/code.js` for full documentation.

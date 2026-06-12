/**
 * Connector Template — Copy this file to create a new connector.
 *
 * Steps:
 * 1. Copy this file and rename to your-connector.ts
 * 2. Fill in all fields below
 * 3. Export from packages/shared/src/index.ts
 * 4. Register in packages/shared/src/connectors/registry.ts (add to connectors array)
 * 5. Add OAuth secrets to AWS SSM (/baita/prod/{name}-client-id, etc.)
 * 6. Add env vars to apps/backend/serverless.yml
 * 7. Deploy: cd apps/backend && npm run deploy
 */
import { VariableType } from '../schemas/service'
import { IConnectorManifest } from './index'

export const templateConnector: IConnectorManifest = {
  // Unique identifier (lowercase, no spaces)
  id: 'your-connector',

  // Display name shown in the UI
  name: 'Your Connector',

  // Optional icon key (used for displaying logos)
  icon: '/icons/your-connector.svg',

  // Category for grouping in the connector picker
  category: 'CRM', // Options: CRM, Productivity, Communication, Marketing, etc.

  // UUID matching the appId in defines/apps.ts (for bot builder compatibility)
  appId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',

  // Authentication configuration
  auth: {
    type: 'oauth2',

    // OAuth2 authorization endpoint (where user is redirected)
    authorizationUrl: 'https://auth.provider.com/oauth/authorize',

    // Token exchange endpoint (code → tokens)
    tokenUrl: 'https://auth.provider.com/oauth/token',

    // Token refresh endpoint (usually same as tokenUrl)
    refreshUrl: 'https://auth.provider.com/oauth/token',

    // Required OAuth scopes
    scopes: ['read', 'write'],

    // Endpoint to fetch authenticated user info
    userInfoUrl: 'https://api.provider.com/me',

    // JSON path to the unique user ID in the userInfo response
    // Use dot notation for nested: 'data.id' or flat: 'sub'
    userIdField: 'id',

    // Public OAuth client ID (safe to include in frontend code)
    clientId: 'your-public-client-id',

    // Environment variable names for OAuth credentials (resolved from AWS SSM at deploy time)
    clientIdEnvVar: 'YOUR_CONNECTOR_CLIENT_ID',
    clientSecretEnvVar: 'YOUR_CONNECTOR_CLIENT_SECRET',

    // How to send client credentials during token exchange:
    // 'basic' = HTTP Basic Auth header (Pipedrive-style)
    // 'body'  = client_id/client_secret in POST body (Google-style)
    tokenAuthMethod: 'body',
  },

  // Base URL for all API operations
  base: {
    url: 'https://api.provider.com/v1',
    // Optional default headers for all requests
    // headers: { 'X-Api-Version': '2024-01' },
  },

  // Health check endpoint (used by "Test connection" feature)
  // Should be a lightweight GET that returns 200 if credentials are valid
  healthCheck: {
    url: '/me', // Relative to base.url
    method: 'GET',
  },

  // Available operations (shown in bot builder)
  operations: [
    {
      id: 'get-user',
      name: 'Get Current User',
      description: 'Retrieve the authenticated user profile',
      method: 'GET',
      path: '/me',
      inputFields: [],
      // Optional: extract a specific path from the response
      // outputPath: 'data',
    },
    {
      id: 'search-contacts',
      name: 'Search Contacts',
      description: 'Search for contacts by name or email',
      method: 'GET',
      path: '/contacts/search',
      inputFields: [
        {
          type: VariableType.text,
          name: 'query',
          label: 'Search Query',
          required: true,
        },
        {
          type: VariableType.text,
          name: 'limit',
          label: 'Max Results',
          value: '10',
        },
      ],
      outputPath: 'data',
    },
    {
      id: 'create-contact',
      name: 'Create Contact',
      description: 'Create a new contact',
      method: 'POST',
      path: '/contacts',
      inputFields: [
        {
          type: VariableType.text,
          name: 'name',
          label: 'Name',
          required: true,
        },
        { type: VariableType.text, name: 'email', label: 'Email' },
        { type: VariableType.text, name: 'phone', label: 'Phone' },
      ],
      outputPath: 'data',
    },
  ],
}

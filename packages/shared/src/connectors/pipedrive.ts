import { VariableType } from '../schemas/service'
import { ConnectorManifest } from './index'

export const pipedriveConnector: ConnectorManifest = {
  id: 'pipedrive',
  name: 'Pipedrive',
  icon: 'pipedrive',
  category: 'CRM',
  auth: {
    type: 'oauth2',
    authorizationUrl: 'https://oauth.pipedrive.com/oauth/authorize',
    tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
    refreshUrl: 'https://oauth.pipedrive.com/oauth/token',
    scopes: ['contacts:full', 'deals:full'],
    userInfoUrl: 'https://api.pipedrive.com/v1/users/me',
    userIdField: 'data.id',
    clientIdEnvVar: 'PIPEDRIVE_CLIENT_ID',
    clientSecretEnvVar: 'PIPEDRIVE_CLIENT_SECRET',
    tokenAuthMethod: 'basic',
  },
  base: { url: 'https://api.pipedrive.com/v1' },
  healthCheck: { url: '/users/me', method: 'GET' },
  operations: [
    {
      id: 'search-persons',
      name: 'Search Persons',
      description: 'Search for persons by name or email',
      method: 'GET',
      path: '/persons/search',
      inputFields: [
        {
          type: VariableType.text,
          name: 'term',
          label: 'Search Term',
          required: true,
        },
      ],
      outputPath: 'data.items',
    },
    {
      id: 'create-person',
      name: 'Create Person',
      description: 'Create a new person/contact',
      method: 'POST',
      path: '/persons',
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
    {
      id: 'list-deals',
      name: 'List Deals',
      description: 'Get all deals',
      method: 'GET',
      path: '/deals',
      inputFields: [
        {
          type: VariableType.text,
          name: 'status',
          label: 'Status',
          value: 'open',
        },
      ],
      outputPath: 'data',
    },
  ],
}

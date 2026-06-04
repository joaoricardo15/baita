import { VariableType } from '../schemas/service'
import { IConnectorManifest } from './index'

export const pipedriveConnector: IConnectorManifest = {
  id: 'pipedrive',
  name: 'Pipedrive',
  icon: '/icons/pipedrive.png',
  category: 'CRM',
  appId: '19c1921c-9a6b-4def-91c8-8bcba8239bf5',
  auth: {
    type: 'oauth2',
    authorizationUrl: 'https://oauth.pipedrive.com/oauth/authorize',
    tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
    refreshUrl: 'https://oauth.pipedrive.com/oauth/token',
    scopes: ['contacts:full', 'deals:full'],
    userInfoUrl: 'https://api.pipedrive.com/v1/users/me',
    userIdField: 'data.id',
    clientId: '987a469172b3ac62',
    clientIdEnvVar: 'PIPEDRIVE_CLIENT_ID',
    clientSecretEnvVar: 'PIPEDRIVE_CLIENT_SECRET',
    tokenAuthMethod: 'basic',
  },
  base: { url: 'https://api.pipedrive.com/v1' },
  healthCheck: { url: '/users/me', method: 'GET' },
  operations: [
    {
      id: 'search-person',
      name: 'Search person',
      description: 'Search for a person by name, email, phone, or notes',
      method: 'GET',
      path: '/persons/search',
      inputFields: [
        {
          name: 'fieldName',
          label: 'Search field name',
          type: VariableType.options,
          required: true,
          options: [
            { label: 'Name', value: 'name' },
            { label: 'E-mail', value: 'email' },
            { label: 'Phone', value: 'phone' },
            { label: 'Notes', value: 'notes' },
            { label: 'Custom fields', value: 'customFields' },
          ],
        },
        {
          name: 'term',
          label: 'Search term',
          type: VariableType.output,
          required: true,
        },
        {
          name: 'start',
          label: 'Start page',
          type: VariableType.constant,
          value: '0',
        },
      ],
      outputPath: 'data.items.0.item',
    },
    {
      id: 'search-deal',
      name: 'Search deal',
      description: 'Search for a deal by title or notes',
      method: 'GET',
      path: '/deals/search',
      inputFields: [
        {
          name: 'fieldName',
          label: 'Search field name',
          type: VariableType.options,
          required: true,
          options: [
            { label: 'Title', value: 'title' },
            { label: 'Notes', value: 'notes' },
            { label: 'Custom fields', value: 'customFields' },
          ],
        },
        {
          name: 'term',
          label: 'Search term',
          type: VariableType.output,
          required: true,
        },
        {
          name: 'start',
          label: 'Start page',
          type: VariableType.constant,
          value: '0',
        },
      ],
      outputPath: 'data.items.0.item',
    },
  ],
}

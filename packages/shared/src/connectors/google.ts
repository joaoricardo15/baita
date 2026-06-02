import { VariableType } from '../schemas/service'
import { ConnectorManifest } from './index'

export const googleConnector: ConnectorManifest = {
  id: 'google',
  name: 'Google',
  icon: 'google',
  category: 'Productivity',
  appId: '5c16e311-a65a-449c-ad82-1f23a41cf89c',
  auth: {
    type: 'oauth2',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/auth',
    tokenUrl: 'https://accounts.google.com/o/oauth2/token',
    refreshUrl: 'https://accounts.google.com/o/oauth2/token',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    userIdField: 'sub',
    clientId:
      '106617044495-k3n0koedh38faoclgjqdss7vptfoirjr.apps.googleusercontent.com',
    clientIdEnvVar: 'GOOGLE_CLIENT_ID',
    clientSecretEnvVar: 'GOOGLE_CLIENT_SECRET',
  },
  base: { url: 'https://www.googleapis.com' },
  healthCheck: { url: '/oauth2/v3/userinfo', method: 'GET' },
  operations: [
    {
      id: 'get-profile',
      name: 'Get Profile',
      description: 'Retrieve the authenticated user profile',
      method: 'GET',
      path: '/oauth2/v3/userinfo',
      inputFields: [],
    },
    {
      id: 'list-messages',
      name: 'List Gmail Messages',
      description: 'Get recent email messages',
      method: 'GET',
      path: '/gmail/v1/users/me/messages',
      inputFields: [
        {
          type: VariableType.text,
          name: 'maxResults',
          label: 'Max Results',
          value: '10',
        },
        { type: VariableType.text, name: 'q', label: 'Search Query' },
      ],
    },
  ],
}

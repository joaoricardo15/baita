import { VariableType } from '../schemas/service'
import { ConnectorManifest } from './index'

export const googleConnector: ConnectorManifest = {
  id: 'google',
  name: 'Google',
  icon: 'https://www.google.com/favicon.ico',
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
      'https://www.googleapis.com/auth/gmail.send',
    ],
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    userIdField: 'sub',
    clientId:
      '106617044495-k3n0koedh38faoclgjqdss7vptfoirjr.apps.googleusercontent.com',
    clientIdEnvVar: 'GOOGLE_CLIENT_ID',
    clientSecretEnvVar: 'GOOGLE_CLIENT_SECRET',
  },
  base: { url: 'https://gmail.googleapis.com' },
  healthCheck: {
    url: 'https://www.googleapis.com/oauth2/v3/userinfo',
    method: 'GET',
  },
  operations: [
    {
      id: 'send-message',
      name: 'Send email',
      description: 'Send an email message',
      method: 'POST',
      path: '/gmail/v1/users/me/messages/send',
      inputFields: [
        {
          name: 'to',
          label: 'To',
          type: VariableType.output,
          required: true,
        },
        {
          name: 'subject',
          label: 'Subject',
          type: VariableType.output,
          required: true,
        },
        {
          name: 'body',
          label: 'Body',
          type: VariableType.output,
          required: true,
        },
      ],
      outputPath: 'id',
    },
  ],
}

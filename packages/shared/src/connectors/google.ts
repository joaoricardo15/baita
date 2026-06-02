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
      id: 'search-emails',
      name: 'Search emails',
      description: 'Search for emails using Gmail search syntax',
      method: 'GET',
      path: '/gmail/v1/users/me/messages',
      inputFields: [
        {
          name: 'q',
          label: 'Search query',
          type: VariableType.output,
          description:
            'Gmail search syntax (e.g. from:boss is:unread subject:invoice)',
        },
        {
          name: 'maxResults',
          label: 'Max results',
          type: VariableType.options,
          value: '10',
          options: [
            { label: '5', value: '5' },
            { label: '10', value: '10' },
            { label: '20', value: '20' },
          ],
        },
      ],
      outputPath: 'messages',
    },
    {
      id: 'get-message',
      name: 'Get email details',
      description: 'Get full details of an email by its ID',
      method: 'GET',
      path: '/gmail/v1/users/me/messages/{id}',
      inputFields: [
        {
          name: 'id',
          label: 'Message ID',
          type: VariableType.output,
          required: true,
        },
        {
          name: 'format',
          label: 'Format',
          type: VariableType.options,
          value: 'full',
          options: [
            { label: 'Full', value: 'full' },
            { label: 'Metadata only', value: 'metadata' },
          ],
        },
      ],
      outputPath: 'payload',
    },
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
    {
      id: 'list-labels',
      name: 'List labels',
      description: 'Get all Gmail labels',
      method: 'GET',
      path: '/gmail/v1/users/me/labels',
      inputFields: [],
      outputPath: 'labels',
    },
  ],
}

import { VariableType } from '../schemas/service'
import { IConnectorManifest } from './index'

export const googleConnector: IConnectorManifest = {
  id: 'google',
  name: 'Google',
  icon: '/icons/google.png',
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
      'https://www.googleapis.com/auth/gmail.readonly',
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
      bodyEncoding: 'email-rfc2822',
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
      id: 'list-messages',
      name: 'List emails',
      description: 'List email messages from inbox',
      method: 'GET',
      path: '/gmail/v1/users/me/messages',
      inputFields: [
        {
          name: 'q',
          label: 'Search query',
          type: VariableType.output,
          required: false,
        },
        {
          name: 'maxResults',
          label: 'Max results',
          type: VariableType.output,
          required: false,
        },
      ],
      outputPath: 'messages',
    },
    {
      id: 'get-message',
      name: 'Get email',
      description: 'Get a specific email message by ID',
      method: 'GET',
      path: '/gmail/v1/users/me/messages/{messageId}',
      inputFields: [
        {
          name: 'messageId',
          label: 'Message ID',
          type: VariableType.output,
          required: true,
        },
      ],
      outputPath: '',
      outputMapping: {
        id: 'id',
        snippet: 'snippet',
        from: 'payload.headers[name=From].value',
        to: 'payload.headers[name=To].value',
        subject: 'payload.headers[name=Subject].value',
        date: 'payload.headers[name=Date].value',
        body: 'payload|email-body',
      },
    },
  ],
}

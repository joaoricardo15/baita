import { IAppService } from '../models/app'
import {
  MethodName,
  ServiceName,
  ServiceType,
  VariableType,
} from '../models/service'

const apps: IAppService[] = [
  {
    name: 'Baita',
    appId: '2d12accb-4b7c-4d22-bdbc-4875a404b929',
    config: {},
    services: [
      {
        type: ServiceType.trigger,
        name: ServiceName.webhook,
        label: 'Webhook',
        config: {},
      },
      {
        type: ServiceType.trigger,
        name: ServiceName.schedule,
        label: 'Schedule',
        config: {
          inputFields: [
            {
              name: 'expression',
              label: 'Expression',
              type: VariableType.options,
              required: true,
              options: [
                {
                  label: 'Run every 10 minutes',
                  value: 'rate(10 minutes)',
                },
                {
                  label: 'Run every 30 minutes',
                  value: 'rate(30 minutes)',
                },
                {
                  label: 'Run every hour',
                  value: 'rate(1 hour)',
                },
                {
                  label: 'Run every day at 9:00 am',
                  value: 'cron(0 9 * * ? *)',
                },
                {
                  label: 'Run every day at 8:00, 12:00, 16:00 and 20:00',
                  value: 'cron(0 8,12,16,20 * * ? *)',
                },
                {
                  label: 'Run every Monday through Friday at 9:00 am',
                  value: 'cron(0 9 ? * MON-FRI *)',
                },
                {
                  label:
                    'Run every hour Monday to Friday between 9:00 am and 5:00 pm',
                  value: 'cron(0 9-17 ? * MON-FRI *)',
                },
              ],
            },
            {
              name: 'timeZone',
              label: 'Time Zone',
              type: VariableType.user,
              required: true,
            },
          ],
        },
      },
      {
        type: ServiceType.invoke,
        name: ServiceName.code,
        label: 'Run Javascript',
        config: {
          customFields: true,
          inputFields: [
            {
              type: VariableType.code,
              name: 'code',
              label: 'Code',
              description: `1. Insert your Javascript code here.\n2. Access your variables with the same name as you declared them.\n3. The output will be what is attributed to "output" variable`,
              required: true,
              value: `const id = '123';\nconst title = 'abc';\n\n\n\n\n\n\n\noutput = { id, title };`,
            },
          ],
        },
      },
      {
        type: ServiceType.invoke,
        name: ServiceName.method,
        label: 'Get my "To Do" list',
        config: {
          methodName: MethodName.getTodo,
        },
      },
      {
        type: ServiceType.invoke,
        name: ServiceName.method,
        label: 'Send me a notification',
        config: {
          methodName: MethodName.sendNotification,
          inputFields: [
            {
              name: 'token',
              label: 'Token',
              type: VariableType.user,
              required: true,
            },
            {
              name: 'notification.title',
              label: 'Title',
              type: VariableType.output,
              required: true,
            },
            {
              name: 'notification.body',
              label: 'Body',
              type: VariableType.output,
            },
            {
              name: 'notification.icon',
              label: 'Icon',
              type: VariableType.output,
            },
            {
              name: 'notification.image',
              label: 'Image',
              type: VariableType.output,
            },
            {
              name: 'notification.timestamp',
              label: 'Timestamp',
              type: VariableType.output,
            },
            {
              name: 'notification.actions',
              label: 'Actions',
              type: VariableType.output,
            },
            {
              name: 'url',
              label: 'On click Url',
              type: VariableType.output,
            },
          ],
        },
      },
      {
        type: ServiceType.invoke,
        name: ServiceName.method,
        label: 'Publish content to feed',
        config: {
          methodName: MethodName.publishToFeed,
          inputFields: [
            {
              name: 'content',
              label: 'content',
              type: VariableType.output,
              required: true,
            },
          ],
        },
      },
    ],
  },
  {
    name: 'NewsAPI',
    appId: 'f9686ea8-ac80-4f70-b35b-asd',
    config: {
      apiUrl: 'https://newsapi.org/v2',
    },
    services: [
      {
        type: ServiceType.invoke,
        name: ServiceName.method,
        label: 'Get top headlines',
        config: {
          methodName: MethodName.httpRequest,
          inputFields: [
            {
              name: 'method',
              label: 'Method',
              type: VariableType.constant,
              required: true,
              value: 'get',
            },
            {
              name: 'path',
              label: 'Path',
              type: VariableType.constant,
              required: true,
              value: 'top-headlines',
            },
            {
              name: 'queryParams.apiKey',
              label: 'Api key',
              type: VariableType.environment,
              required: true,
              value: 'NEWS_API_KEY',
            },
            {
              name: 'queryParams.country',
              label: 'Country',
              type: VariableType.options,
              required: true,
              options: [
                {
                  label: 'United States',
                  value: 'us',
                },
                {
                  label: 'Brazil',
                  value: 'br',
                },
                {
                  label: 'Netherlands',
                  value: 'nl',
                },
              ],
            },
            {
              name: 'queryParams.q',
              label: 'Key words',
              type: VariableType.output,
            },
            {
              name: 'queryParams.pageSize',
              label: 'Page size',
              type: VariableType.constant,
              value: '30',
            },
          ],
          outputPath: 'articles',
          outputMapping: {
            source: '###NewsAPI',
            contentId: 'publishedAt',
            header: 'title',
            body: 'description',
            image: 'urlToImage',
            date: 'publishedAt',
            url: 'url',
            'author.name': 'source.name',
          },
        },
      },
      {
        type: ServiceType.invoke,
        name: ServiceName.method,
        label: 'Get news',
        config: {
          methodName: MethodName.httpRequest,
          inputFields: [
            {
              name: 'method',
              label: 'Method',
              type: VariableType.constant,
              required: true,
              value: 'get',
            },
            {
              name: 'path',
              label: 'Path',
              type: VariableType.constant,
              required: true,
              value: 'everything',
            },
            {
              name: 'queryParams.apiKey',
              label: 'Api key',
              type: VariableType.environment,
              required: true,
              value: 'NEWS_API_KEY',
            },
            {
              name: 'queryParams.language',
              label: 'Language',
              type: VariableType.options,
              required: true,
              options: [
                {
                  label: 'English',
                  value: 'en',
                },
                {
                  label: 'Portuguese',
                  value: 'pt',
                },
                {
                  label: 'Dutch',
                  value: 'nl',
                },
              ],
            },
            {
              name: 'queryParams.q',
              label: 'Key words',
              type: VariableType.output,
              required: true,
            },
            {
              name: 'queryParams.pageSize',
              label: 'Page size',
              type: VariableType.constant,
              value: '30',
            },
          ],
          outputPath: 'articles',
          outputMapping: {
            source: '###NewsAPI',
            contentId: 'publishedAt',
            header: 'title',
            body: 'description',
            image: 'urlToImage',
            date: 'publishedAt',
            url: 'url',
            'author.name': 'source.name',
          },
        },
      },
    ],
  },
  {
    name: 'ChatGPT',
    appId: 'f9686ea8-ac80-4f70-b35b-hggfhjhk',
    config: {
      apiUrl: 'https://api.openai.com/v1',
    },
    services: [
      {
        type: ServiceType.invoke,
        name: ServiceName.method,
        label: 'Get Text Completion',
        config: {
          methodName: MethodName.httpRequest,
          inputFields: [
            {
              name: 'method',
              label: 'Method',
              type: VariableType.constant,
              required: true,
              value: 'post',
            },
            {
              name: 'path',
              label: 'Path',
              type: VariableType.constant,
              required: true,
              value: 'chat/completions',
            },
            {
              name: 'headers.Authorization',
              label: 'Authorization',
              type: VariableType.environment,
              required: true,
              value: 'OPENAI_API_AUTHORIZATION',
            },
            {
              name: 'bodyParams.model',
              label: 'Model',
              type: VariableType.constant,
              required: true,
              value: 'gpt-4o-mini',
            },
            {
              name: 'bodyParams.temperature',
              label: 'Temperature',
              type: VariableType.constant,
              value: 0.9,
            },
            {
              name: 'bodyParams.max_completion_tokens',
              label: 'Max tokens',
              type: VariableType.constant,
              value: 100,
            },
            {
              name: 'bodyParams.messages.0.role',
              label: 'Role of chat message',
              type: VariableType.constant,
              required: true,
              value: 'user',
            },
            {
              name: 'bodyParams.messages.0.content',
              label: 'Content of chat message',
              type: VariableType.output,
              required: true,
            },
          ],
          outputPath: 'choices.0.message.content',
        },
      },
      {
        type: ServiceType.invoke,
        name: ServiceName.method,
        label: 'Create an image',
        config: {
          methodName: MethodName.httpRequest,
          inputFields: [
            {
              name: 'method',
              label: 'Method',
              type: VariableType.constant,
              required: true,
              value: 'post',
            },
            {
              name: 'path',
              label: 'Path',
              type: VariableType.constant,
              required: true,
              value: 'images/generations',
            },
            {
              name: 'headers.Authorization',
              label: 'Authorization',
              type: VariableType.environment,
              required: true,
              value: 'OPENAI_API_AUTHORIZATION',
            },
            {
              name: 'bodyParams.model',
              label: 'Image generation model',
              type: VariableType.constant,
              required: true,
              value: 'dall-e-3',
            },
            {
              name: 'bodyParams.prompt',
              label: 'What kind of image?',
              type: VariableType.output,
              required: true,
            },
            {
              name: 'bodyParams.size',
              label: 'Size',
              type: VariableType.constant,
              required: true,
              value: '1024x1024',
            },
          ],
          outputPath: 'data.0.url',
        },
      },
    ],
  },
  {
    name: 'Pipedrive',
    appId: '19c1921c-9a6b-4def-91c8-8bcba8239bf5',
    config: {
      apiUrl: 'https://api.pipedrive.com/v1',
      authorizeUrl:
        'https://oauth.pipedrive.com/oauth/authorize?client_id=987a469172b3ac62&redirect_uri=https://api.baita.help/connectors/oauth&response_type=code&state=',
      auth: {
        type: 'basic',
        method: 'post',
        url: 'https://oauth.pipedrive.com/oauth/token',
        headers: {
          'Content-type': 'application/x-www-form-urlencoded',
        },
        fields: {
          username: 'PIPEDRIVE_CLIENT_ID',
          password: 'PIPEDRIVE_CLIENT_SECRET',
        },
      },
    },
    services: [
      {
        type: ServiceType.invoke,
        name: ServiceName.method,
        label: 'Search person',
        config: {
          methodName: MethodName.oauth2Request,
          inputFields: [
            {
              name: 'method',
              label: 'Method',
              type: VariableType.constant,
              value: 'get',
            },
            {
              name: 'path',
              label: 'Path',
              type: VariableType.constant,
              value: 'persons/search',
            },
            {
              name: 'queryParams.fieldName',
              label: 'search field name',
              type: VariableType.options,
              required: true,
              options: [
                {
                  label: 'Name',
                  value: 'name',
                },
                {
                  label: 'E-mail',
                  value: 'email',
                },
                {
                  label: 'Phone',
                  value: 'phone',
                },
                {
                  label: 'Notes',
                  value: 'notes',
                },
                {
                  label: 'Custom fields',
                  value: 'customFields',
                },
              ],
            },
            {
              name: 'queryParams.term',
              label: 'Search term',
              type: VariableType.output,
              required: true,
            },
            {
              name: 'queryParams.start',
              label: 'Start page',
              type: VariableType.constant,
              value: '0',
            },
          ],
          outputPath: 'data.items.0.item',
        },
      },
      {
        type: ServiceType.invoke,
        name: ServiceName.method,
        label: 'Search deal',
        config: {
          methodName: MethodName.oauth2Request,
          inputFields: [
            {
              name: 'method',
              label: 'Method',
              type: VariableType.constant,
              value: 'get',
            },
            {
              name: 'path',
              label: 'Path',
              type: VariableType.constant,
              value: 'deals/search',
            },
            {
              name: 'queryParams.fieldName',
              label: 'search field name',
              type: VariableType.options,
              required: true,
              options: [
                {
                  label: 'Title',
                  value: 'title',
                },
                {
                  label: 'Notes',
                  value: 'notes',
                },
                {
                  label: 'Custom fields',
                  value: 'customFields',
                },
              ],
            },
            {
              name: 'queryParams.term',
              label: 'Search term',
              type: VariableType.output,
              required: true,
            },
            {
              name: 'queryParams.start',
              label: 'Start page',
              type: VariableType.constant,
              value: '0',
            },
          ],
          outputPath: 'data.items.0.item',
        },
      },
    ],
  },
  {
    name: 'GMail',
    appId: '5c16e311-a65a-449c-ad82-1f23a41cf89c',
    config: {
      apiUrl: 'https://gmail.googleapis.com',
      authorizeUrl:
        'https://accounts.google.com/o/oauth2/auth?client_id=106617044495-k3n0koedh38faoclgjqdss7vptfoirjr.apps.googleusercontent.com&redirect_uri=https://api.baita.help/connectors/oauth&response_type=code&scope=https://www.googleapis.com/auth/userinfo.email+https://mail.google.com/+https://www.googleapis.com/auth/pubsub&access_type=offline&prompt=consent&state=',
      auth: {
        type: 'body',
        method: 'post',
        url: 'https://accounts.google.com/o/oauth2/token',
        headers: {
          'Content-type': 'application/x-www-form-urlencoded',
        },
        fields: {
          username: 'GOOGLE_CLIENT_ID',
          password: 'GOOGLE_CLIENT_SECRET',
        },
      },
    },
    services: [],
  },
]

export default apps

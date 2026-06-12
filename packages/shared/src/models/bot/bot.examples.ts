import {
  MethodName,
  ServiceName,
  ServiceType,
  VariableType,
} from '../../schemas/service'
import { TaskExecutionStatus } from '../../schemas/task'
import { IBot, IBotLog } from './bot.schema'

export const exampleBot: IBot = {
  botId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  name: 'Daily News Digest',
  active: true,
  description:
    'Fetches top headlines and publishes them to the content feed every morning',
  tasks: [
    {
      taskId: 0,
      inputData: [
        {
          name: 'expression',
          label: 'Run every day at 9:00 am',
          type: VariableType.options,
          value: 'cron(0 9 * * ? *)',
          required: true,
        },
        {
          name: 'timeZone',
          label: 'Time Zone',
          type: VariableType.user,
          value: 'Europe/Amsterdam',
          required: true,
        },
      ],
      service: {
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
                { value: 'rate(1 hour)', label: 'Run every hour' },
                {
                  value: 'cron(0 9 * * ? *)',
                  label: 'Run every day at 9:00 am',
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
    },
    {
      taskId: 1,
      connectionId: 'conn-newsapi-abc',
      inputData: [
        {
          name: 'queryParams.language',
          label: 'English',
          type: VariableType.options,
          value: 'en',
          required: true,
        },
      ],
      service: {
        type: ServiceType.invoke,
        name: ServiceName.http,
        label: 'Get top headlines',
        config: {
          inputFields: [
            {
              name: 'queryParams.language',
              label: 'Language',
              type: VariableType.options,
              required: true,
              options: [
                { value: 'en', label: 'English' },
                { value: 'pt', label: 'Portuguese' },
              ],
            },
          ],
          outputPath: 'articles',
          outputMapping: {
            header: 'title',
            body: 'description',
            image: 'urlToImage',
            url: 'url',
            source: '###NewsAPI',
            contentId: 'publishedAt',
            date: 'publishedAt',
          },
        },
      },
      app: {
        appId: 'newsapi',
        name: 'NewsAPI',
        config: { apiUrl: 'https://newsapi.org/v2' },
      },
    },
    {
      taskId: 2,
      inputData: [
        {
          name: 'content',
          label: 'task 1: [ ... ]',
          type: VariableType.output,
          outputIndex: 1,
          outputPath: '',
          required: true,
        },
      ],
      service: {
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
      app: {
        appId: 'baita',
        name: 'Baita',
        config: {},
      },
    },
  ],
  triggerSamples: [],
}

export const exampleBotSimple: IBot = {
  botId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  name: 'Code Runner',
  active: false,
  description: 'Runs a JavaScript snippet on a webhook trigger',
  tasks: [
    {
      taskId: 0,
      inputData: [],
      service: {
        type: ServiceType.trigger,
        name: ServiceName.webhook,
        label: 'Webhook',
        config: { inputFields: [] },
      },
    },
    {
      taskId: 1,
      inputData: [
        {
          name: 'code',
          label: 'Code',
          type: VariableType.code,
          value: 'return { sum: 2 + 2, now: new Date().toISOString() }',
          required: true,
        },
      ],
      service: {
        type: ServiceType.invoke,
        name: ServiceName.code,
        label: 'Run code',
        config: {
          inputFields: [
            {
              name: 'code',
              label: 'Code',
              type: VariableType.code,
              required: true,
            },
          ],
        },
      },
    },
  ],
  triggerSamples: [
    {
      timestamp: 1718000000000,
      status: TaskExecutionStatus.success,
      inputData: {},
      outputData: { event: 'new_order', orderId: 'ORD-12345' },
    },
  ],
}

export const exampleBotList: IBot[] = [exampleBot, exampleBotSimple]

export const exampleBotLog: IBotLog = {
  botId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  timestamp: 1718000000000,
  usage: 1250,
  logs: [
    {
      name: 'Fetch headlines',
      timestamp: 1718000000100,
      status: TaskExecutionStatus.success,
      inputData: { language: 'en' },
      outputData: [
        {
          header: 'AI Breakthrough Announced',
          body: 'Researchers achieve new milestone',
          url: 'https://example.com/article',
          image: 'https://example.com/img.jpg',
          source: 'NewsAPI',
          contentId: '1718000000000',
        },
      ],
    },
    {
      name: 'Publish to feed',
      timestamp: 1718000002500,
      status: TaskExecutionStatus.success,
      inputData: { content: '(array of 5 items)' },
      outputData: { published: 5, duplicates: 2 },
    },
  ],
}

export const exampleBotLogs: IBotLog[] = [
  exampleBotLog,
  {
    botId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    timestamp: 1717900000000,
    usage: 800,
    logs: [
      {
        name: 'Fetch headlines',
        timestamp: 1717900000100,
        status: TaskExecutionStatus.fail,
        inputData: { language: 'en' },
        outputData: { error: 'API rate limit exceeded' },
      },
    ],
  },
]

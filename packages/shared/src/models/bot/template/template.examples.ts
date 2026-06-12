import {
  MethodName,
  ServiceName,
  ServiceType,
  VariableType,
} from '../../../schemas/service'
import { IBotTemplate } from './template.schema'

export const exampleBotTemplateNews: IBotTemplate = {
  templateId: 'template-news-digest',
  name: 'News Digest',
  author: 'baita',
  description:
    'Fetches daily headlines from your chosen topics and sends a summary notification',
  image: '/icons/newsapi.svg',
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
}

export const exampleBotTemplateTodo: IBotTemplate = {
  templateId: 'template-todo-reminder',
  name: 'Todo Reminder',
  author: 'baita',
  description:
    'Sends you a push notification with your top todo item every morning',
  image: '/icons/baita.svg',
  tasks: [
    {
      taskId: 0,
      inputData: [
        {
          name: 'expression',
          label: 'Run every day at 8:00 am',
          type: VariableType.options,
          value: 'cron(0 8 * * ? *)',
          required: true,
        },
        {
          name: 'timeZone',
          label: 'Time Zone',
          type: VariableType.user,
          required: true,
        },
      ],
      service: {
        type: ServiceType.trigger,
        name: ServiceName.schedule,
        label: 'Schedule',
        config: { inputFields: [] },
      },
    },
    {
      taskId: 1,
      inputData: [],
      service: {
        type: ServiceType.invoke,
        name: ServiceName.method,
        label: 'Get my "To Do" list',
        config: { methodName: MethodName.getTodo, inputFields: [] },
      },
      app: {
        appId: 'baita',
        name: 'Baita',
        config: {},
      },
    },
  ],
}

export const exampleBotTemplateList: IBotTemplate[] = [
  exampleBotTemplateNews,
  exampleBotTemplateTodo,
]

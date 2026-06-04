import {
  MethodName,
  ServiceName,
  ServiceType,
  VariableType,
} from '../schemas/service'
import { IConnectorManifest } from './index'

export const baitaConnector: IConnectorManifest = {
  id: 'baita',
  name: 'Baita',
  icon: '/icons/baita.png',
  category: 'Platform',
  appId: '2d12accb-4b7c-4d22-bdbc-4875a404b929',
  auth: { type: 'none' },
  base: { url: '' },
  operations: [],
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
              { label: 'Run every 10 minutes', value: 'rate(10 minutes)' },
              { label: 'Run every 30 minutes', value: 'rate(30 minutes)' },
              { label: 'Run every hour', value: 'rate(1 hour)' },
              { label: 'Run every day at 9:00 am', value: 'cron(0 9 * * ? *)' },
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
          { name: 'url', label: 'On click Url', type: VariableType.output },
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
}

import { VariableType } from '../schemas/service'
import { IConnectorManifest } from './index'

export const openaiConnector: IConnectorManifest = {
  id: 'openai',
  name: 'ChatGPT',
  icon: '/icons/openai.png',
  category: 'AI',
  appId: '0f7bb503-b9b4-4fd5-80ab-9a97d52397bb',
  auth: {
    type: 'userApiKey',
    headerName: 'Authorization',
    prefix: 'Bearer ',
  },
  base: { url: 'https://api.openai.com/v1' },
  healthCheck: { url: '/models', method: 'GET' },
  operations: [
    {
      id: 'text-completion',
      name: 'Get Text Completion',
      description: 'Generate text using GPT models',
      method: 'POST',
      path: '/chat/completions',
      inputFields: [
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
    {
      id: 'create-image',
      name: 'Create an image',
      description: 'Generate an image using DALL-E',
      method: 'POST',
      path: '/images/generations',
      inputFields: [
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
  ],
}

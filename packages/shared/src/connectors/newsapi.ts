import { VariableType } from '../schemas/service'
import { IConnectorManifest } from './index'

export const newsapiConnector: IConnectorManifest = {
  id: 'newsapi',
  name: 'NewsAPI',
  icon: '/icons/newsapi.png',
  category: 'News',
  appId: 'dcf88373-238e-4335-8ba1-81a81fa73874',
  auth: {
    type: 'apiKey',
    headerName: 'X-Api-Key',
    envVar: 'NEWS_API_KEY',
  },
  base: { url: 'https://newsapi.org/v2' },
  operations: [
    {
      id: 'top-headlines',
      name: 'Get top headlines',
      description: 'Get top headlines by country and keyword',
      method: 'GET',
      path: '/top-headlines',
      inputFields: [
        {
          name: 'country',
          label: 'Country',
          type: VariableType.options,
          required: true,
          options: [
            { label: 'United States', value: 'us' },
            { label: 'Brazil', value: 'br' },
            { label: 'Netherlands', value: 'nl' },
          ],
        },
        {
          name: 'q',
          label: 'Key words',
          type: VariableType.output,
        },
        {
          name: 'pageSize',
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
    {
      id: 'everything',
      name: 'Get news',
      description: 'Search all news articles by keyword and language',
      method: 'GET',
      path: '/everything',
      inputFields: [
        {
          name: 'language',
          label: 'Language',
          type: VariableType.options,
          required: true,
          options: [
            { label: 'English', value: 'en' },
            { label: 'Portuguese', value: 'pt' },
            { label: 'Dutch', value: 'nl' },
          ],
        },
        {
          name: 'q',
          label: 'Key words',
          type: VariableType.output,
          required: true,
        },
        {
          name: 'pageSize',
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
  ],
}

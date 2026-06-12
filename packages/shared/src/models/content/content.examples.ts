export interface IContentItem {
  contentId: string
  header: string
  body: string
  url: string
  image?: string
  source: string
  date: string
  publishedAt: number
}

export const exampleContentItems: IContentItem[] = [
  {
    contentId: 'news-ai-breakthrough-2025',
    header: 'Major AI Breakthrough Announced',
    body: 'Researchers achieve new milestone in language understanding with novel architecture',
    url: 'https://example.com/article/ai-breakthrough',
    image: 'https://example.com/images/ai-research.jpg',
    source: 'NewsAPI',
    date: '2025-06-10T08:00:00Z',
    publishedAt: 1718000000000,
  },
  {
    contentId: 'news-climate-summit-2025',
    header: 'Global Climate Summit Reaches Historic Agreement',
    body: 'World leaders commit to ambitious carbon reduction targets at annual summit',
    url: 'https://example.com/article/climate-summit',
    image: 'https://example.com/images/summit.jpg',
    source: 'NewsAPI',
    date: '2025-06-09T14:30:00Z',
    publishedAt: 1717940000000,
  },
  {
    contentId: 'news-tech-startup-funding',
    header: 'European Tech Startup Raises $50M Series B',
    body: 'Amsterdam-based automation startup secures funding to expand globally',
    url: 'https://example.com/article/startup-funding',
    source: 'NewsAPI',
    date: '2025-06-09T10:00:00Z',
    publishedAt: 1717920000000,
  },
]

export const exampleContentFeed = exampleContentItems

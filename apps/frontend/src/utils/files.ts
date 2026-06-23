import { FILES_BASE_URL } from './config'

export const getImageUrl = (key: string) =>
  `${FILES_BASE_URL}/${encodeURIComponent(key)}`

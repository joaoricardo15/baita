import appConfig from './config'
export type { Labels } from './config'

export function getLabels<T extends Record<string, Record<string, string>>>(
  labels: T
): T[keyof T] {
  return labels[appConfig.language as keyof T]
}

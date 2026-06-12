import { DataType, ITransform } from '@baita/shared'

export function getDataFromPath(
  data: DataType,
  outputPath?: string
): DataType | undefined {
  if (!outputPath) {
    return data
  }

  const paths = outputPath.split('.')
  let current: Record<string | number, unknown> = data as Record<
    string | number,
    unknown
  >

  for (let i = 0; i < paths.length; i++) {
    const segment = paths[i]
    const findMatch = segment.match(/^(\w+)\[(\w+)=(.+)\]$/)

    if (findMatch) {
      const [, arrayKey, searchKey, searchValue] = findMatch
      if (
        !current ||
        typeof current !== 'object' ||
        !Object.hasOwn(current, arrayKey)
      ) {
        return undefined
      }
      const arr = current[arrayKey]
      if (!Array.isArray(arr)) return undefined
      const found = arr.find(
        (item: Record<string, unknown>) => item[searchKey] === searchValue
      )
      if (!found) return undefined
      current = found as Record<string | number, unknown>
    } else {
      const key = isNaN(Number(segment)) ? segment : Number(segment)

      if (
        !current ||
        typeof current !== 'object' ||
        !Object.hasOwn(current, key)
      ) {
        return undefined
      }

      current = current[key] as Record<string | number, unknown>
    }
  }

  return current
}

export function setObjectDataFromPath(
  data: object,
  value: DataType,
  inputPath?: string
): object {
  if (!inputPath) {
    return data
  }

  let currentData = data as Record<string, unknown>
  const paths = inputPath.split('.')

  for (let i = 0; i < paths.length; i++) {
    const key = paths[i]

    if (i === paths.length - 1) {
      currentData[key] = value
    } else if (!(key in currentData)) {
      const nextIntKey = Number(paths[i + 1])
      if (isNaN(nextIntKey)) {
        currentData[key] = {}
      } else {
        currentData[key] = []
      }
    }

    currentData = currentData[key] as Record<string, unknown>
  }

  return data
}

export function getMappedData(
  data: DataType,
  outputMapping?: Record<string, string>
): DataType {
  if (!outputMapping) return data

  return Array.isArray(data)
    ? data
        .map((item) => getDataFromMapping(item, outputMapping))
        .filter((item) => item)
    : getDataFromMapping(data, outputMapping)
}

export function getDataFromMapping(
  data: DataType,
  outputMapping: Record<string, string>
): Record<string, DataType> {
  let mappedData: Record<string, DataType> = {}
  const outputKeys = Object.keys(outputMapping)

  for (let i = 0; i < outputKeys.length; i++) {
    const outputKey = outputKeys[i]
    const mappingValue = outputMapping[outputKey]

    let outputValue: DataType | undefined
    if (mappingValue.startsWith('###')) {
      outputValue = mappingValue.slice(3)
    } else {
      const [path, ...pipeNames] = mappingValue.split('|')
      outputValue = getDataFromPath(data, path)
      for (const pipe of pipeNames) {
        if (outputValue === undefined) break
        outputValue = applyPipe(outputValue, pipe)
      }
    }

    if (outputValue !== undefined) {
      mappedData = setObjectDataFromPath(
        mappedData,
        outputValue,
        outputKey
      ) as Record<string, DataType>
    }
  }

  return mappedData
}

function applyPipe(value: DataType, pipe: string): DataType | undefined {
  const fn = pipes[pipe]
  return fn ? fn(value) : value
}

export function applyTransformToValue(
  data: DataType,
  transform: ITransform
): DataType {
  if (!data || !transform) return data
  const { operation, index, property, operator, value, direction } = transform

  switch (operation) {
    case 'first':
      return Array.isArray(data) ? data[0] : data
    case 'last':
      return Array.isArray(data) ? data[data.length - 1] : data
    case 'at':
      return Array.isArray(data) ? data[index ?? 0] : data
    case 'count':
      return Array.isArray(data) ? data.length : 0
    case 'pluck':
      return Array.isArray(data)
        ? data.map((item) => (item as Record<string, unknown>)?.[property!])
        : data
    case 'filter':
      if (!Array.isArray(data)) return data
      return data.filter((item) => {
        const itemVal = (item as Record<string, unknown>)?.[property!]
        switch (operator) {
          case 'equals':
            return String(itemVal ?? '') === value
          case 'notEquals':
            return String(itemVal ?? '') !== value
          case 'contains':
            return String(itemVal ?? '').includes(value || '')
          case 'greaterThan':
            return String(itemVal ?? '') > (value || '')
          case 'lessThan':
            return String(itemVal ?? '') < (value || '')
          case 'exists':
            return itemVal !== undefined && itemVal !== null
          case 'notExists':
            return itemVal === undefined || itemVal === null
          default:
            return true
        }
      })
    case 'join':
      return Array.isArray(data) ? data.join(value || ', ') : data
    case 'sort': {
      if (!Array.isArray(data)) return data
      const dir = direction === 'desc' ? -1 : 1
      return [...data].sort((a, b) => {
        const aVal = String((a as Record<string, unknown>)?.[property!] ?? '')
        const bVal = String((b as Record<string, unknown>)?.[property!] ?? '')
        return aVal > bVal ? dir : -dir
      })
    }
    default:
      return data
  }
}

// --- Pipes (used by output mapping) ---

type PipeFn = (value: DataType) => DataType | undefined

function base64urlDecode(value: DataType): DataType | undefined {
  if (typeof value !== 'string') return value
  return Buffer.from(value, 'base64url').toString('utf-8')
}

function extractEmailBody(payload: DataType): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const p = payload as Record<string, unknown>

  const bodyData = (p.body as Record<string, unknown>)?.data
  if (typeof bodyData === 'string' && bodyData.length > 0) {
    const decoded = Buffer.from(bodyData, 'base64url').toString('utf-8')
    if (decoded.trim()) return decoded
  }

  const parts = p.parts as Array<Record<string, unknown>> | undefined
  if (!Array.isArray(parts)) return undefined

  const textPart = parts.find((part) => part.mimeType === 'text/plain')
  if (textPart) {
    const data = (textPart.body as Record<string, unknown>)?.data
    if (typeof data === 'string' && data.length > 0) {
      const decoded = Buffer.from(data, 'base64url').toString('utf-8')
      if (decoded.trim()) return decoded
    }
  }

  const htmlPart = parts.find((part) => part.mimeType === 'text/html')
  if (htmlPart) {
    const data = (htmlPart.body as Record<string, unknown>)?.data
    if (typeof data === 'string' && data.length > 0) {
      const html = Buffer.from(data, 'base64url').toString('utf-8')
      const text = stripHtml(html)
      if (text) return text
    }
  }

  for (const part of parts) {
    const nested = extractEmailBody(part)
    if (nested) return nested
  }

  return undefined
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

const pipes: Record<string, PipeFn> = {
  base64url: base64urlDecode,
  'email-body': extractEmailBody,
}

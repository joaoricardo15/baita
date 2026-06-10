import { TaskExecutionStatus } from '@baita/shared'
import { DataType } from '@baita/shared'
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda'

export enum ApiRequestStatus {
  fail = 'fail',
  timeout = 'timeout',
  filtered = 'filtered',
  success = 'success',
}

let isColdStart = true

class Api {
  private startTime: number
  private method: string
  private path: string
  private requestId: string
  private traceId: string
  private userId: string
  private origin: string
  private ip: string
  private userAgent: string
  private requestBody: DataType | null

  constructor(event: APIGatewayProxyEvent, context: Context) {
    this.startTime = Date.now()
    this.method = event.httpMethod
    this.path = event.path
    this.requestId = context.awsRequestId
    this.traceId = event.headers?.['X-Amzn-Trace-Id'] || ''
    this.origin = event.headers?.origin || event.headers?.referer || ''
    this.ip = event.headers?.['X-Forwarded-For']?.split(',')[0]?.trim() || ''
    this.userAgent = event.headers?.['User-Agent'] || ''

    const rawUserId = (event.requestContext?.authorizer?.userId as string) || ''
    this.userId = rawUserId.includes('|') ? rawUserId.split('|')[1] : rawUserId

    try {
      this.requestBody = event.body ? JSON.parse(event.body) : null
    } catch {
      this.requestBody = event.body
    }
  }

  parseError(err: unknown): string {
    if (!err) return ''
    if (typeof err === 'string') return err
    if (typeof err === 'number') return String(err)

    if (err instanceof Error) {
      const axiosErr = err as Error & {
        response?: { status?: number; data?: unknown }
      }
      if (axiosErr.response) {
        const { status, data } = axiosErr.response
        const message = this.extractApiErrorMessage(data)
        return message
          ? `HTTP ${status}: ${message}`
          : `HTTP ${status}: ${err.message}`
      }
      return err.message
    }

    if (typeof err === 'object') {
      const obj = err as Record<string, unknown>
      if (typeof obj.message === 'string') return obj.message
      if (typeof obj.errorMessage === 'string') return obj.errorMessage
      if (typeof obj.error === 'string') return obj.error
      if (Array.isArray(obj.errors)) {
        const joined = obj.errors
          .map((e: { message?: string }) => e.message)
          .filter(Boolean)
          .join('; ')
        if (joined) return joined
      }
      return JSON.stringify(err)
    }

    return 'An unexpected error occurred'
  }

  private extractApiErrorMessage(data: unknown): string {
    if (!data || typeof data !== 'object') return ''

    const obj = data as Record<string, unknown>

    if (obj.error && typeof obj.error === 'object') {
      const error = obj.error as Record<string, unknown>
      if (typeof error.message === 'string') return error.message
    }

    if (typeof obj.error === 'string') return obj.error
    if (typeof obj.message === 'string') return obj.message
    if (typeof obj.error_description === 'string') return obj.error_description

    return ''
  }

  private emitLog(
    status: ApiRequestStatus | TaskExecutionStatus,
    error?: string,
    responseBody?: DataType
  ): void {
    const isError =
      status === ApiRequestStatus.fail || status === ApiRequestStatus.timeout
    const level = isError ? 'ERROR' : 'INFO'
    const durationMs = Date.now() - this.startTime

    let message = `${this.method} ${this.path} → ${status}`
    if (error) message += `: ${error}`

    const logEntry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'baita-api',
      requestId: this.requestId,
      traceId: this.traceId || undefined,
      method: this.method,
      path: this.path,
      status,
      durationMs,
      coldStart: isColdStart,
      userId: this.userId || undefined,
      origin: this.origin || undefined,
      ip: this.ip || undefined,
      userAgent: this.userAgent || undefined,
      requestBody: this.requestBody,
      responseBody,
      error: error || undefined,
    }

    isColdStart = false

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logEntry))
  }

  httpResponse(
    callback: Callback,
    status: ApiRequestStatus,
    error?: unknown,
    data?: DataType
  ): void {
    const errorMessage = this.parseError(error)
    const responseBody = {
      success: status === ApiRequestStatus.success,
      message: errorMessage,
      data,
    }

    this.emitLog(status, errorMessage, responseBody)

    callback(null, {
      statusCode: 200,
      headers: {
        'Content-type': 'application/json',
        'Access-Control-Allow-Origin':
          process.env.SERVICE_SITE_URL || 'https://www.baita.help',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify(responseBody),
    })
  }

  httpConnectorResponse(
    callback: Callback,
    status: ApiRequestStatus,
    error?: unknown
  ): void {
    const errorMessage = this.parseError(error)

    this.emitLog(status, errorMessage)

    callback(null, {
      statusCode: 200,
      headers: { 'Content-type': 'text/html' },
      body: '<script>window.close()</script>',
    })
  }

  taskExecutionResponse(
    callback: Callback,
    status: TaskExecutionStatus,
    error?: unknown,
    data?: DataType
  ): void {
    const errorMessage = this.parseError(error)
    const responseBody = {
      success: status === TaskExecutionStatus.success,
      message: errorMessage,
      data,
    }

    this.emitLog(status, errorMessage, responseBody)

    callback(null, responseBody)
  }
}

export default Api

import { Callback, Context } from 'aws-lambda'
import { TaskExecutionStatus } from 'src/models/bot/interface'
import { DataType } from 'src/models/service/interface'

import { LAMBDA_TIMEOUT_BUFFER_MS } from './constants'

export enum ApiRequestStatus {
  fail = 'fail',
  timeout = 'timeout',
  filtered = 'filtered',
  success = 'success',
}

class Api {
  timeoutLogger: ReturnType<typeof setTimeout>
  logObject: {
    inputData: DataType
    status?: ApiRequestStatus | TaskExecutionStatus
    message?: string
    data?: DataType
  }

  constructor(inputData: DataType, functionContext: Context) {
    this.logObject = { inputData }

    this.timeoutLogger = setTimeout(() => {
      this.log(ApiRequestStatus.timeout)
    }, functionContext.getRemainingTimeInMillis() - LAMBDA_TIMEOUT_BUFFER_MS)
  }

  parseError(err: unknown): string {
    if (!err) return ''
    if (typeof err === 'string') return err
    if (typeof err === 'number') return String(err)
    if (err instanceof Error) return err.message

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

  log(
    status: ApiRequestStatus | TaskExecutionStatus,
    error?: string,
    data?: DataType
  ): void {
    clearTimeout(this.timeoutLogger)

    this.logObject.status = status
    this.logObject.message = error
    this.logObject.data = data
    console.log(JSON.stringify(this.logObject))
  }

  httpResponse(
    callback: Callback,
    status: ApiRequestStatus,
    error?: unknown,
    data?: DataType
  ): void {
    const errorMessage = this.parseError(error)

    this.log(status, errorMessage, data)

    callback(null, {
      statusCode: 200,
      headers: {
        'Content-type': 'application/json',
        'Access-Control-Allow-Origin':
          process.env.SERVICE_SITE_URL || 'https://www.baita.help',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        success: status === ApiRequestStatus.success,
        message: errorMessage,
        data,
      }),
    })
  }

  httpConnectorResponse(
    callback: Callback,
    status: ApiRequestStatus,
    error?: unknown
  ): void {
    const errorMessage = this.parseError(error)

    this.log(status, errorMessage)

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

    this.log(status, errorMessage, data)

    callback(null, {
      success: status === TaskExecutionStatus.success,
      message: errorMessage,
      data,
    })
  }
}

export default Api

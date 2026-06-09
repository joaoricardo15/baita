import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { Error as ErrorComponent } from '@/components'
import { publishEvent } from '@/utils/firebase'

import { AuthContext } from './auth'

export const ErrorContext = createContext<{
  publishLog: (error: unknown, message?: string, stack?: string) => void
}>({
  publishLog: () => undefined,
})

const ErrorProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { error } = useContext(AuthContext)

  const [errorMessage, setErrorMessage] = useState<string>()

  const publishLog = (error: unknown) => {
    const { errorMessage, errorFile, errorObject } = parseError(error)

    publishEvent('exception', {
      message: errorMessage,
      error: errorObject,
      file: errorFile,
    })
  }

  const resetError = () => {
    setErrorMessage('')
  }

  useEffect(() => {
    window.addEventListener('error', publishLog)
    window.addEventListener('unhandledrejection', publishLog)

    return () => {
      window.removeEventListener('error', publishLog)
      window.removeEventListener('unhandledrejection', publishLog)
    }
  }, [])

  // It renders ErrorPage both from errors caught
  // on global EventListeners and react-error-boundary
  return (
    <ErrorContext.Provider value={{ publishLog }}>
      {errorMessage ? (
        <ErrorComponent
          errorMessage={errorMessage || error?.message}
          buttonCallback={resetError}
        />
      ) : (
        <ErrorBoundary
          FallbackComponent={() => (
            <ErrorComponent
              errorMessage={errorMessage}
              buttonCallback={resetError}
            />
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </ErrorContext.Provider>
  )
}

export default ErrorProvider

export const parseError = (
  error: unknown
): { errorMessage: string; errorFile: string; errorObject: unknown } => {
  if (error instanceof Error) {
    const { message, stack, cause } = error
    return {
      errorMessage: message,
      errorFile: stack || '',
      errorObject: cause,
    }
  } else if (error instanceof ErrorEvent) {
    const { message, filename, error: errorObject } = error
    return {
      errorMessage: message,
      errorFile: filename,
      errorObject: errorObject,
    }
  } else if (error instanceof PromiseRejectionEvent) {
    const {
      reason: { message, stack, cause },
    } = error
    return {
      errorMessage: message,
      errorFile: stack,
      errorObject: cause,
    }
  }

  return {
    errorMessage: 'Untracked error',
    errorFile: 'Untracked file',
    errorObject: error,
  }
}

import { useAuth0 } from '@auth0/auth0-react'
import { createContext, FC, ReactNode } from 'react'

import { IUser } from '@baita/shared'
import { unsubscribeFromPush } from '@/utils/push'

export const AuthContext = createContext<{
  isLoading: boolean
  error: Error | undefined
  user: IUser | undefined
  isAdmin: boolean
  login: () => Promise<void>
  logout: () => void
  getToken: () => Promise<string>
}>({
  isLoading: true,
  error: undefined,
  user: undefined,
  isAdmin: false,
  login: () => new Promise((resolve) => resolve()),
  logout: () => undefined,
  getToken: () => new Promise((resolve) => resolve('')),
})

const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const {
    user,
    isLoading,
    isAuthenticated,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
    error,
  } = useAuth0()

  return (
    <AuthContext.Provider
      value={{
        error,
        isLoading,
        login: loginWithRedirect,
        logout: () => {
          unsubscribeFromPush()
          logout({ returnTo: window.location.origin })
        },
        getToken: getAccessTokenSilently,
        isAdmin: user?.email === 'joaoricardocardoso15@gmail.com',
        user:
          !isAuthenticated || !user
            ? undefined
            : {
                userId: user.sub?.split('|')[1] || '',
                picture: user.picture || '',
                email: user.email || '',
                name: user.name || '',
              },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider

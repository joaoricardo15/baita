import './assets/index.scss'

import { createTheme, ThemeProvider } from '@mui/material'
import { FC } from 'react'
import { BrowserRouter } from 'react-router-dom'

import Styles from './assets/variables.module.scss'
import AuthProvider from './providers/auth'
import ErrorProvider from './providers/error'
import NotificationProvider from './providers/notification'
import Router from './router'

const theme = createTheme({
  palette: {
    info: { main: Styles.infoColor },
    error: { main: Styles.errorColor },
    warning: { main: Styles.warningColor },
    success: { main: Styles.successColor },
    primary: { main: Styles.primaryColor },
    secondary: { main: Styles.secondaryColor },
    background: { default: Styles.backgroundColor },
  },
})

const App: FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <ErrorProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Router />
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </ErrorProvider>
    </ThemeProvider>
  )
}

export default App

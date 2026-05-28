import { AppState, Auth0Provider } from '@auth0/auth0-react'
import ReactDOM from 'react-dom/client'

import App from './app'
import authConfig from './auth0.json'

const onRedirectCallback = (appState?: AppState) => {
  window.history.replaceState(
    {},
    document.title,
    appState?.returnTo || window.location.pathname
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Auth0Provider
    domain={authConfig.domain}
    clientId={authConfig.clientId}
    audience={authConfig.audience}
    redirectUri={window.location.origin}
    cacheLocation="localstorage"
    useRefreshTokens={true}
    scope="offline_access"
    onRedirectCallback={onRedirectCallback}
  >
    <App />
  </Auth0Provider>
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .catch(() => undefined)
}

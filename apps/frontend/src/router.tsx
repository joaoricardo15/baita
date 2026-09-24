import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FC, useContext, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { Loading } from './components'
import PushHealthCheck from './components/pushHealthCheck'
import NavBar from './navBar'
import AppsProvider from './providers/apps'
import { AuthContext } from './providers/auth'
import { publishEvent } from './utils/firebase'
import Bot from './views/bot'
import Bots from './views/bots'
import Connections from './views/connections'
import Document from './views/document'
import Feed from './views/feed'
import Feelings from './views/feelings'
import FeelingCapture from './views/feelings/capture'
import Landing from './views/landing'
import Logs from './views/logs'
import NotFound from './views/notFound'
import Places from './views/places'
import Profile from './views/profile'
import ToDo from './views/todo'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
})

const Router: FC = () => {
  const location = useLocation()
  const { isLoading, user } = useContext(AuthContext)

  const publicRoutes = () => (
    <>
      <Route path={LINKS.terms} element={<Document name="terms" />} />
      <Route path={LINKS.install} element={<Document name="install" />} />
      <Route path={LINKS.privacy} element={<Document name="privacy" />} />
    </>
  )

  useEffect(() => {
    publishEvent('page_view', { path: location.pathname })
  }, [location])

  return (
    <>
      <NavBar />
      {isLoading ? (
        <Loading />
      ) : (
        <div className="h-100 overflow-scroll p-2">
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {!user ? (
              <Routes>
                <Route path={LINKS.home} element={<Landing />} />
                {publicRoutes()}
              </Routes>
            ) : (
              <QueryClientProvider client={queryClient}>
                <AppsProvider>
                  <PushHealthCheck />
                  <Routes>
                    {publicRoutes()}
                    <Route path={LINKS.home} element={<ToDo />} />
                    <Route path={LINKS.todo} element={<ToDo />} />
                    <Route path={LINKS.feed} element={<Feed />} />
                    <Route path={LINKS.bots} element={<Bots />} />
                    <Route path={LINKS.connections} element={<Connections />} />
                    <Route path={LINKS.feelings} element={<Feelings />} />
                    <Route
                      path={LINKS.feelingNew}
                      element={<FeelingCapture />}
                    />
                    <Route
                      path={LINKS.feeling(':feelingId')}
                      element={<FeelingCapture />}
                    />
                    <Route path={LINKS.place} element={<Places />} />
                    <Route path={LINKS.profile} element={<Profile />} />
                    <Route path={LINKS.notFound} element={<NotFound />} />
                    <Route path={LINKS.bot(':botId')} element={<Bot />} />
                    <Route path={LINKS.logs(':botId')} element={<Logs />} />
                    <Route
                      path="*"
                      element={<Navigate replace to={LINKS.notFound} />}
                    />
                  </Routes>
                </AppsProvider>
              </QueryClientProvider>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default Router

export const LINKS = {
  home: '/',
  bots: '/bots',
  todo: '/todo',
  feed: '/feed',
  place: '/place',
  terms: '/terms',
  feelings: '/feelings',
  feelingNew: '/feelings/new',
  feeling: (feelingId: string) => `/feelings/${feelingId}`,
  notFound: '/404',
  profile: '/profile',
  privacy: '/privacy',
  install: '/install',
  connections: '/connections',
  bot: (botId: string) => `/bots/${botId}`,
  logs: (botId: string) => `/bots/${botId}/logs`,
}

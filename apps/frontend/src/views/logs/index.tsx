import { withAuthenticationRequired } from '@auth0/auth0-react'
import { FC } from 'react'
import { useParams } from 'react-router-dom'

import { Loading, Skeleton, Text } from '@/components'
import { useBot } from '@/hooks/useBots'
import { useLogs } from '@/hooks/useLogs'
import { getLabels, Labels } from '@/utils/labels'
import Log from './components/log'
import TopBar from './components/topBar'

export const Logs: FC = () => {
  const { botId } = useParams()
  const { data: bot } = useBot(botId)
  const { data: botLogs, isLoading: fetching, refetch } = useLogs(botId)

  return (
    <div className="mt-2">
      <TopBar botName={bot?.name} onRefreshClick={() => refetch()} />
      <div className="mt-4">
        {fetching || !botLogs ? (
          <Skeleton elements={3} height={100} />
        ) : !botLogs.length ? (
          <Text>{labels.noLogs}</Text>
        ) : (
          botLogs.map((botLog, i) => <Log key={i} botLog={botLog} />)
        )}
      </div>
    </div>
  )
}

export default withAuthenticationRequired(Logs, {
  onRedirecting: () => <Loading />,
})

const LABELS: Labels = {
  en: {
    noLogs: 'This bot has no logs yet!',
  },
  pt: {
    noLogs: 'Este Bot ainda não possui logs!',
  },
}

const labels = getLabels(LABELS)

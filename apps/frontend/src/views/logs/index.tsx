import { withAuthenticationRequired } from '@auth0/auth0-react'
import { FC, useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Loading, Skeleton, Text } from '../../components'
import { IBotLog } from '../../models/bot'
import { BotContext } from '../../providers/bot'
import { getLabels, Labels } from '../../utils/labels'
import ApiRequest from '../../utils/requests'
import Log from './components/log'
import TopBar from './components/topBar'

export const Logs: FC = () => {
  const { botId } = useParams()
  const apiRequest = ApiRequest()
  const { bot, getBot } = useContext(BotContext)

  const [fetching, setFetching] = useState<boolean>(false)
  const [botLogs, setBotLogs] = useState<IBotLog[]>()

  const refresh = () => {
    if (botId && !fetching) {
      setFetching(true)

      apiRequest
        .getLogs(botId)
        .then((logs) => {
          setBotLogs(logs)
        })
        .finally(() => {
          setFetching(false)
        })
    }
  }

  useEffect(() => {
    if (botId && !bot) {
      getBot(botId)
    }
  }, [botId])

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="mt-2">
      <TopBar botName={bot?.name} onRefreshClick={refresh} />
      <div className="mt-4">
        {fetching || !botLogs ? (
          <Skeleton height={120} />
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

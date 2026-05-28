import { withAuthenticationRequired } from '@auth0/auth0-react'
import { FC, useContext, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { Loading } from '../../components'
import { BotContext } from '../../providers/bot'
import Skeleton from './components/skeleton'
import Task from './components/task'
import TopBar from './components/topBar'

export const BotComponent: FC = () => {
  const { botId } = useParams()
  const { bot, getBot } = useContext(BotContext)

  useEffect(() => {
    if (botId && !bot) {
      getBot(botId)
    }
  }, [botId])

  return (
    <div className="mt-2">
      {!bot ? (
        <Skeleton />
      ) : (
        <>
          <TopBar
            name={bot.name}
            image={bot.image}
            isActive={bot.active}
            description={bot.description}
          />

          {bot.tasks.map((_, taskIndex) => (
            <Task key={taskIndex} taskIndex={taskIndex} />
          ))}
        </>
      )}
    </div>
  )
}

export default withAuthenticationRequired(BotComponent, {
  onRedirecting: () => <Loading />,
})

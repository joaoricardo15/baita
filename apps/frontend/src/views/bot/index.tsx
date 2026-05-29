import { withAuthenticationRequired } from '@auth0/auth0-react'
import { AutoAwesome as AiIcon, Build as BuildIcon } from '@mui/icons-material'
import { Tab, Tabs } from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Loading } from '../../components'
import { ITask } from '../../models/bot'
import { BotContext } from '../../providers/bot'
import { getAiService } from '../../utils/ai'
import BotAssistant from './components/assistant'
import Skeleton from './components/skeleton'
import Task from './components/task'
import TopBar from './components/topBar'

export const BotComponent: FC = () => {
  const { botId } = useParams()
  const { bot, getBot, updateBot } = useContext(BotContext)
  const [mode, setMode] = useState<'builder' | 'assistant'>('builder')
  const [aiAvailable, setAiAvailable] = useState(false)

  useEffect(() => {
    if (botId && !bot) {
      getBot(botId)
    }
  }, [botId])

  useEffect(() => {
    getAiService().then((svc) => setAiAvailable(svc?.provider === 'chrome-ai'))
  }, [])

  const handleTasksGenerated = (tasks: ITask[]) => {
    if (bot) {
      updateBot({ ...bot, tasks })
      setMode('builder')
    }
  }

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

          {aiAvailable && (
            <Tabs
              value={mode}
              onChange={(_, v) => setMode(v)}
              className="mb-3"
              variant="fullWidth"
            >
              <Tab
                value="builder"
                icon={<BuildIcon />}
                label="Builder"
                iconPosition="start"
              />
              <Tab
                value="assistant"
                icon={<AiIcon />}
                label="AI Assistant"
                iconPosition="start"
              />
            </Tabs>
          )}

          {mode === 'builder' ? (
            bot.tasks.map((_, taskIndex) => (
              <Task key={taskIndex} taskIndex={taskIndex} />
            ))
          ) : (
            <BotAssistant bot={bot} onTasksGenerated={handleTasksGenerated} />
          )}
        </>
      )}
    </div>
  )
}

export default withAuthenticationRequired(BotComponent, {
  onRedirecting: () => <Loading />,
})

import { withAuthenticationRequired } from '@auth0/auth0-react'
import { FC, useContext, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Loading } from '@/components'
import { BotContext } from '@/providers/bot'
import { getAiService } from '@/utils/ai'

import BotAssistant from './components/assistant'
import Skeleton from './components/skeleton'
import Task from './components/task'
import TopBar from './components/topBar'

export const BotComponent: FC = () => {
  const { botId } = useParams()
  const { bot, getBot } = useContext(BotContext)
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number | null>(
    null
  )
  const prevTaskCount = useRef(bot?.tasks.length ?? 0)

  useEffect(() => {
    if (botId && !bot) {
      getBot(botId)
    }
  }, [botId])

  useEffect(() => {
    getAiService().then((svc) => setAiAvailable(svc !== null))
  }, [])

  useEffect(() => {
    const currentCount = bot?.tasks.length ?? 0
    if (currentCount > prevTaskCount.current) {
      setTimeout(() => {
        const tasks = document.querySelectorAll('[data-task]')
        tasks[tasks.length - 1]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 150)
    }
    prevTaskCount.current = currentCount
  }, [bot?.tasks.length])

  const selectedTask =
    selectedTaskIndex !== null ? bot?.tasks[selectedTaskIndex] : undefined

  return (
    <div className="mt-2" style={{ paddingBottom: '12rem' }}>
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
            <Task
              key={taskIndex}
              taskIndex={taskIndex}
              isSelected={taskIndex === selectedTaskIndex}
              onSelect={() =>
                setSelectedTaskIndex(
                  taskIndex === selectedTaskIndex ? null : taskIndex
                )
              }
            />
          ))}

          {aiAvailable &&
            selectedTask?.service &&
            selectedTaskIndex !== null && (
              <BotAssistant
                bot={bot}
                task={selectedTask}
                taskIndex={selectedTaskIndex}
              />
            )}
        </>
      )}
    </div>
  )
}

export default withAuthenticationRequired(BotComponent, {
  onRedirecting: () => <Loading />,
})

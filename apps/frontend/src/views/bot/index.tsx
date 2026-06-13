import { withAuthenticationRequired } from '@auth0/auth0-react'
import { ErrorOutline as ErrorOutlineIcon } from '@mui/icons-material'
import { FC, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { EmptyState, Loading, Text } from '@/components'
import { flush } from '@/hooks/botSaveManager'
import { useBot } from '@/hooks/useBots'
import { useBotSaveStatus } from '@/hooks/useBotSaveStatus'
import { getAiService } from '@/utils/ai'
import { getLabels, Labels } from '@/utils/labels'

import BotAssistant from './components/assistant'
import Skeleton from './components/skeleton'
import Task from './components/task'
import TopBar from './components/topBar'

export const BotComponent: FC = () => {
  const { botId } = useParams()
  const { data: bot, isError: error } = useBot(botId)
  const saveStatus = useBotSaveStatus()
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number | null>(
    null
  )
  const prevTaskCount = useRef(bot?.tasks.length ?? 0)

  useEffect(() => {
    getAiService().then((svc) => setAiAvailable(svc !== null))
  }, [])

  useEffect(() => {
    return () => {
      flush()
    }
  }, [])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      flush()
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
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
      {error ? (
        <EmptyState
          icon={<ErrorOutlineIcon style={{ fontSize: 48 }} />}
          title={labels.errorTitle}
          description={labels.errorDescription}
        />
      ) : !bot ? (
        <Skeleton />
      ) : (
        <>
          <TopBar
            name={bot.name}
            image={bot.image}
            isActive={bot.active}
            description={bot.description}
          />

          {saveStatus !== 'idle' && (
            <Text
              className={`mx-3 fs-6 ${
                saveStatus === 'saving'
                  ? 'text-secondary'
                  : saveStatus === 'saved'
                    ? 'text-success'
                    : 'text-danger'
              }`}
            >
              {saveStatus === 'saving'
                ? labels.saving
                : saveStatus === 'saved'
                  ? labels.saved
                  : labels.saveError}
            </Text>
          )}

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

const LABELS: Labels = {
  en: {
    loadError: 'Could not load bot',
    errorTitle: 'Bot not found',
    errorDescription: 'This bot could not be loaded. It may have been deleted.',
    saving: 'Saving...',
    saved: 'Saved',
    saveError: 'Save failed',
  },
  pt: {
    loadError: 'Nao foi possivel carregar o bot',
    errorTitle: 'Bot nao encontrado',
    errorDescription:
      'Nao foi possivel carregar este bot. Ele pode ter sido excluido.',
    saving: 'Salvando...',
    saved: 'Salvo',
    saveError: 'Erro ao salvar',
  },
}

const labels = getLabels(LABELS)

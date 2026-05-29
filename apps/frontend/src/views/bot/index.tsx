import { withAuthenticationRequired } from '@auth0/auth0-react'
import {
  AutoAwesome as AiIcon,
  Build as BuildIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import { Alert, Tab, Tabs, Tooltip } from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Loading } from '../../components'
import { ITask } from '../../models/bot'
import { BotContext } from '../../providers/bot'
import { getAiService } from '../../utils/ai'
import { getLabels, Labels } from '../../utils/labels'
import BotAssistant from './components/assistant'
import Skeleton from './components/skeleton'
import Task from './components/task'
import TopBar from './components/topBar'

export const BotComponent: FC = () => {
  const { botId } = useParams()
  const { bot, getBot, updateBot } = useContext(BotContext)
  const [mode, setMode] = useState<'builder' | 'assistant'>('builder')
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)
  const labels = getLabels(LABELS)

  useEffect(() => {
    if (botId && !bot) {
      getBot(botId)
    }
  }, [botId])

  useEffect(() => {
    getAiService().then((svc) => setAiAvailable(svc !== null))
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

          <Tabs
            value={mode}
            onChange={(_, v) => {
              if (v === 'assistant' && !aiAvailable) return
              setMode(v)
            }}
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
              label={
                <span className="d-flex align-items-center gap-1">
                  AI Assistant
                  {aiAvailable === false && (
                    <Tooltip title={labels.aiUnavailableTooltip}>
                      <InfoIcon fontSize="small" color="disabled" />
                    </Tooltip>
                  )}
                </span>
              }
              iconPosition="start"
              disabled={!aiAvailable}
            />
          </Tabs>

          {mode === 'assistant' && !aiAvailable && (
            <Alert severity="info" className="mb-3">
              {labels.aiUnavailableMessage}
            </Alert>
          )}

          {mode === 'builder' ? (
            bot.tasks.map((_, taskIndex) => (
              <Task key={taskIndex} taskIndex={taskIndex} />
            ))
          ) : aiAvailable ? (
            <BotAssistant bot={bot} onTasksGenerated={handleTasksGenerated} />
          ) : null}
        </>
      )}
    </div>
  )
}

const LABELS: Labels = {
  en: {
    aiUnavailableTooltip:
      'Requires Chrome 127+ with Built-in AI enabled (chrome://flags → Prompt API)',
    aiUnavailableMessage:
      'AI Assistant requires Chrome with Built-in AI. Enable it at chrome://flags/#optimization-guide-on-device-model and chrome://flags/#prompt-api-for-gemini-nano, then restart Chrome.',
  },
  pt: {
    aiUnavailableTooltip:
      'Requer Chrome 127+ com IA integrada ativada (chrome://flags → Prompt API)',
    aiUnavailableMessage:
      'O Assistente IA requer Chrome com IA integrada. Ative em chrome://flags/#optimization-guide-on-device-model e chrome://flags/#prompt-api-for-gemini-nano, depois reinicie o Chrome.',
  },
}

export default withAuthenticationRequired(BotComponent, {
  onRedirecting: () => <Loading />,
})

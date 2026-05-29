import { Send as SendIcon } from '@mui/icons-material'
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { FC, useContext, useEffect, useRef, useState } from 'react'

import { IBot, ITask, validateBot } from '../../../models/bot'
import { BotContext } from '../../../providers/bot'
import {
  AiMessage,
  buildMessagesWithContext,
  getAiService,
  parseTasksFromResponse,
} from '../../../utils/ai'
import { getLabels, Labels } from '../../../utils/labels'

const BotAssistant: FC<{
  bot: IBot
  onTasksGenerated: (tasks: ITask[]) => void
}> = ({ bot, onTasksGenerated }) => {
  const { deployBot, updateBot } = useContext(BotContext)
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedTasks, setGeneratedTasks] = useState<ITask[] | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const labels = getLabels(LABELS)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const aiMessages = buildMessagesWithContext(
        userMessage,
        bot.tasks.length > 1 ? bot.tasks : undefined,
        messages
      )

      const service = await getAiService()
      if (!service) throw new Error('AI not available')

      const response = await service.generate(aiMessages)
      setMessages((prev) => [...prev, { role: 'assistant', content: response }])

      const tasks = parseTasksFromResponse(response)
      if (tasks) {
        setGeneratedTasks(tasks)
        const validation = validateBot({ ...bot, tasks })
        setValidationErrors(validation.errors)
        if (validation.valid) {
          onTasksGenerated(tasks)
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: labels.error },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleDeploy = async () => {
    if (!generatedTasks) return
    const updatedBot = { ...bot, tasks: generatedTasks }
    await updateBot(updatedBot)
    await deployBot(updatedBot)
  }

  return (
    <Box className="d-flex flex-column" sx={{ height: '100%', minHeight: 400 }}>
      <Paper
        variant="outlined"
        className="flex-grow-1 p-3 mb-2"
        sx={{ overflow: 'auto', maxHeight: 400 }}
      >
        {messages.length === 0 && (
          <Typography color="text.secondary" className="text-center mt-4">
            {labels.placeholder}
          </Typography>
        )}
        {messages
          .filter((m) => m.role !== 'system')
          .map((msg, i) => (
            <Box
              key={i}
              className={`mb-2 d-flex ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
            >
              <Paper
                elevation={0}
                className="p-2 px-3"
                sx={{
                  maxWidth: '80%',
                  bgcolor: msg.role === 'user' ? 'primary.light' : 'grey.100',
                  color:
                    msg.role === 'user'
                      ? 'primary.contrastText'
                      : 'text.primary',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </Typography>
              </Paper>
            </Box>
          ))}
        {loading && (
          <Box className="d-flex justify-content-start mb-2">
            <CircularProgress size={20} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Paper>

      {generatedTasks && validationErrors.length === 0 && (
        <Paper variant="outlined" className="p-2 mb-2">
          <Typography variant="body2" color="success.main">
            {labels.ready} ({generatedTasks.length} {labels.tasks})
          </Typography>
          <Box className="d-flex gap-2 mt-1">
            <Chip
              label={labels.deploy}
              color="primary"
              onClick={handleDeploy}
              clickable
            />
            <Chip
              label={labels.openBuilder}
              variant="outlined"
              onClick={() => onTasksGenerated(generatedTasks)}
              clickable
            />
          </Box>
        </Paper>
      )}

      {validationErrors.length > 0 && (
        <Paper variant="outlined" className="p-2 mb-2">
          <Typography variant="body2" color="error">
            {validationErrors[0]}
          </Typography>
        </Paper>
      )}

      <Box className="d-flex gap-1">
        <TextField
          fullWidth
          size="small"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={labels.inputPlaceholder}
          disabled={loading}
          multiline
          maxRows={3}
        />
        <IconButton
          onClick={handleSend}
          disabled={loading || !input.trim()}
          color="primary"
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  )
}

const LABELS: Labels = {
  en: {
    placeholder: 'Describe what you want your bot to do...',
    inputPlaceholder:
      'e.g., "Check the weather every morning and send me a notification"',
    error: 'Something went wrong. Please try again.',
    ready: 'Bot ready!',
    tasks: 'tasks',
    deploy: 'Deploy',
    openBuilder: 'Open in Builder',
  },
  pt: {
    placeholder: 'Descreva o que você quer que seu bot faça...',
    inputPlaceholder:
      'ex: "Verificar notícias toda manhã e me enviar uma notificação"',
    error: 'Algo deu errado. Tente novamente.',
    ready: 'Bot pronto!',
    tasks: 'tarefas',
    deploy: 'Publicar',
    openBuilder: 'Abrir no Editor',
  },
}

export default BotAssistant

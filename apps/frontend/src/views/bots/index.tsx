import { withAuthenticationRequired } from '@auth0/auth0-react'
import {
  Add as AddIcon,
  SmartToyOutlined as SmartToyIcon,
} from '@mui/icons-material'
import { Fab } from '@mui/material'
import { FC } from 'react'
import { useNavigate } from 'react-router-dom'

import { EmptyState, ListItem, Loading, Skeleton } from '@/components'
import { useBots, useBotTemplates, useCreateBot } from '@/hooks/useBots'
import { LINKS } from '@/router'
import { getLabels, Labels } from '@/utils/labels'

import Bot from './components/bot'
import BotTemplate from './components/botTemplate'

export const Bots: FC = () => {
  const navigate = useNavigate()

  const { data: bots, isLoading: botsLoading } = useBots()
  const { data: botTemplates } = useBotTemplates()
  const createBot = useCreateBot()

  const onCreateBot = () => {
    createBot.mutateAsync().then((bot) => navigate(LINKS.bot(bot.botId)))
  }

  const hasNoBots = bots && bots.length === 0
  const hasNoTemplates = !botTemplates || botTemplates.length === 0

  return (
    <>
      {botsLoading || !bots ? (
        <Skeleton elements={3} height={100} />
      ) : hasNoBots && hasNoTemplates ? (
        <EmptyState
          icon={<SmartToyIcon style={{ fontSize: 48 }} />}
          title={labels.emptyTitle}
          description={labels.emptyDescription}
        />
      ) : (
        <>
          {bots
            .filter((bot) => bot.templateId)
            .map((bot, i) => (
              <ListItem key={bot.botId} index={i}>
                <Bot bot={bot} />
              </ListItem>
            ))}

          {botTemplates?.map(
            (botTemplate, i) =>
              !bots
                .map((b) => b.templateId)
                .includes(botTemplate.templateId) && (
                <ListItem
                  key={botTemplate.templateId}
                  index={bots.filter((b) => b.templateId).length + i}
                >
                  <BotTemplate botTemplate={botTemplate} />
                </ListItem>
              )
          )}

          {bots
            .filter((bot) => !bot.templateId)
            .map((bot, i) => (
              <ListItem
                key={bot.botId}
                index={
                  bots.filter((b) => b.templateId).length +
                  (botTemplates?.length || 0) +
                  i
                }
              >
                <Bot bot={bot} />
              </ListItem>
            ))}

          {createBot.isPending && <Skeleton elements={1} height={100} />}
        </>
      )}

      <Fab
        color="primary"
        onClick={onCreateBot}
        disabled={createBot.isPending}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
      >
        <AddIcon />
      </Fab>
    </>
  )
}

export default withAuthenticationRequired(Bots, {
  onRedirecting: () => <Loading />,
})

const LABELS: Labels = {
  en: {
    emptyTitle: 'No bots yet',
    emptyDescription:
      'Create your first bot to automate tasks — tap + to get started.',
  },
  pt: {
    emptyTitle: 'Nenhum bot ainda',
    emptyDescription:
      'Crie o seu primeiro bot para automatizar tarefas — toque + para começar.',
  },
}

const labels = getLabels(LABELS)

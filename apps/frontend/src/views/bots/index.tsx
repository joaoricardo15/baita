import { withAuthenticationRequired } from '@auth0/auth0-react'
import { Add as AddIcon } from '@mui/icons-material'
import { FC } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button, Loading, Skeleton } from '@/components'
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

  return (
    <>
      {botsLoading || !bots ? (
        <Skeleton elements={3} height={100} />
      ) : (
        <>
          {bots
            .filter((bot) => bot.modelId)
            .map((bot) => (
              <div className="mb-2" key={bot.botId}>
                <Bot bot={bot} />
              </div>
            ))}

          {botTemplates?.map(
            (botTemplate) =>
              !bots.map((b) => b.modelId).includes(botTemplate.modelId) && (
                <div key={botTemplate.modelId} className="mb-2">
                  <BotTemplate botTemplate={botTemplate} />
                </div>
              )
          )}

          {bots
            .filter((bot) => !bot.modelId)
            .map((bot, i) => (
              <div className="mb-2" key={i}>
                <Bot bot={bot} />
              </div>
            ))}

          {createBot.isPending ? (
            <Skeleton elements={1} height={100} />
          ) : (
            <div className="d-flex align-items-center justify-content-center mt-5">
              <Button
                type="text"
                color="primary"
                icon={<AddIcon />}
                onClick={onCreateBot}
              >
                {labels.addBot}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  )
}

export default withAuthenticationRequired(Bots, {
  onRedirecting: () => <Loading />,
})

const LABELS: Labels = {
  en: {
    addBot: 'Add bot',
  },
  pt: {
    addBot: 'Adicionar bot',
  },
}

const labels = getLabels(LABELS)

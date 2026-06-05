import { withAuthenticationRequired } from '@auth0/auth0-react'
import { Add as AddIcon } from '@mui/icons-material'
import { Divider } from '@mui/material'
import { FC } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button, Loading, Skeleton, Text } from '@/components'
import { useBotModels, useBots, useCreateBot } from '@/hooks/useBots'
import { LINKS } from '@/router'
import { getLabels, Labels } from '@/utils/labels'
import Bot from './components/bot'
import BotModel from './components/botModel'

export const Bots: FC = () => {
  const navigate = useNavigate()

  const { data: bots, isLoading: botsLoading } = useBots()
  const { data: botModels } = useBotModels()
  const createBot = useCreateBot()

  const onCreateBot = () => {
    navigate(LINKS.bot('new'))
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

          {botModels?.map(
            (botModel) =>
              !bots.map((b) => b.modelId).includes(botModel.modelId) && (
                <div key={botModel.modelId} className="mb-2">
                  <BotModel botModel={botModel} />
                </div>
              )
          )}
          <div className="my-5">
            <Divider>
              <Text type="h5" className="my-1">
                {labels.panelTitle}
              </Text>
            </Divider>
            <div className="mt-5">
              {bots
                .filter((bot) => !bot.modelId)
                .map((bot, i) => (
                  <div className="mb-2" key={i}>
                    <Bot bot={bot} />
                  </div>
                ))}
            </div>
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
          </div>
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
    panelTitle: 'Admin panel',
    addBot: 'Add bot',
  },
  pt: {
    panelTitle: 'Painel de administrador',
    addBot: 'Adicionar bot',
  },
}

const labels = getLabels(LABELS)

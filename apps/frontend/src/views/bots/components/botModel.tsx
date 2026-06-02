import { Delete as DeleteIcon } from '@mui/icons-material'
import { FC, useContext } from 'react'

import { Button } from '@/components'
import { IBotModel } from '@baita/shared'
import { AuthContext } from '@/providers/auth'
import { BotContext } from '@/providers/bot'
import { NotificationContext } from '@/providers/notification'
import { getLabels, Labels } from '@/utils/labels'
import BotCard from './botCard'

const BotModel: FC<{
  botModel: IBotModel
}> = ({ botModel }) => {
  const { isAdmin } = useContext(AuthContext)
  const { showLoading, showSnack } = useContext(NotificationContext)
  const { deployBotModel, deleteBotModel } = useContext(BotContext)

  const onDeployBotModel = () => {
    showLoading(true)
    deployBotModel(botModel.modelId, botModel)
      .then(() => {
        showLoading(false)
        showSnack(labels.testSuccess, 'success')
      })
      .catch((error) => {
        showLoading(false)
        showSnack(typeof error === 'string' ? error : labels.testFail, 'error')
      })
  }

  const onDeleteBot = () => {
    showLoading(true)
    deleteBotModel(botModel.modelId).then(() => showLoading(false))
  }

  return (
    <BotCard
      name={botModel.name}
      image={botModel.image}
      description={botModel.description}
      onToggleBot={onDeployBotModel}
      actionComponent={
        isAdmin && (
          <Button iconButton icon={<DeleteIcon />} onClick={onDeleteBot} />
        )
      }
    />
  )
}

export default BotModel

const LABELS: Labels = {
  en: {
    testSuccess: 'Test run successfully',
    testFail: 'Test failed',
  },
  pt: {
    testSuccess: 'Testado com sucesso',
    testFail: 'Testado com falha',
  },
}

const labels = getLabels(LABELS)

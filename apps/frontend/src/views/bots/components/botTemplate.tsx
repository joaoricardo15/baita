import { IBotTemplate } from '@baita/shared'
import { Delete as DeleteIcon } from '@mui/icons-material'
import { FC, useContext } from 'react'

import { Button } from '@/components'
import { useDeleteBotTemplate, useDeployBotTemplate } from '@/hooks/useBots'
import { AuthContext } from '@/providers/auth'
import { NotificationContext } from '@/providers/notification'
import { getLabels, Labels } from '@/utils/labels'

import BotCard from './botCard'

const BotTemplate: FC<{
  botTemplate: IBotTemplate
}> = ({ botTemplate }) => {
  const { isAdmin } = useContext(AuthContext)
  const { showLoading, showSnack } = useContext(NotificationContext)
  const deployBotTemplate = useDeployBotTemplate()
  const deleteBotTemplate = useDeleteBotTemplate()

  const onDeployBotTemplate = () => {
    showLoading(true)
    deployBotTemplate
      .mutateAsync({ model: botTemplate })
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
    deleteBotTemplate
      .mutateAsync(botTemplate.modelId)
      .finally(() => showLoading(false))
  }

  return (
    <BotCard
      name={botTemplate.name}
      image={botTemplate.image}
      description={botTemplate.description}
      onToggleBot={onDeployBotTemplate}
      actionComponent={
        isAdmin && (
          <Button iconButton icon={<DeleteIcon />} onClick={onDeleteBot} />
        )
      }
    />
  )
}

export default BotTemplate

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

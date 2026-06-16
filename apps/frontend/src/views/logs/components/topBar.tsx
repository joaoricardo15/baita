import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { FC } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button, Text } from '@/components'
import { LINKS } from '@/router'
import { getLabels, Labels } from '@/utils/labels'

const TopBar: FC<{
  botName?: string
  onRefreshClick: () => void
}> = ({ botName, onRefreshClick }) => {
  const { botId } = useParams()
  const navigate = useNavigate()

  return (
    <div className="d-flex align-items-center justify-content-between mx-2">
      <div className="d-flex align-items-center overflow-hidden">
        <Button
          iconButton
          onClick={() => navigate(botId ? LINKS.bot(botId) : LINKS.bots)}
          icon={<ArrowBackIcon color="secondary" />}
        />
        <Text className="fw-bold text-primary text-truncate">
          {botName === undefined ? '...' : botName || labels.noNameBot}
        </Text>
      </div>
      <Button
        iconButton
        icon={<RefreshIcon />}
        tooltip={labels.refreshTooltip}
        onClick={onRefreshClick}
      />
    </div>
  )
}

export default TopBar

const LABELS: Labels = {
  en: {
    refreshTooltip: 'Refresh',
    noNameBot: 'no name bot',
  },
  pt: {
    refreshTooltip: 'Atualizar',
    noNameBot: 'Bot sem name',
  },
}

const labels = getLabels(LABELS)

import {
  Refresh as RefreshIcon,
  SmartToyOutlined as SmartToyOutlinedIcon,
} from '@mui/icons-material'
import { FC } from 'react'

import { Button, Text } from '../../../components'
import { getLabels, Labels } from '../../../utils/labels'

const TopBar: FC<{
  botName?: string
  onRefreshClick: () => void
}> = ({ botName, onRefreshClick }) => {
  return (
    <div className="d-flex align-items-center justify-content-between mx-3">
      <div className="d-flex text-primary align-items-center">
        <SmartToyOutlinedIcon color="secondary" />
        <Text className="fw-bold fs-3 mx-1">
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
    botTitle: 'logs of',
    refreshTooltip: 'Refresh',
    noNameBot: 'no name bot',
  },
  pt: {
    botTitle: 'logs de',
    refreshTooltip: 'Atualizar',
    noNameBot: 'Bot sem name',
  },
}

const labels = getLabels(LABELS)

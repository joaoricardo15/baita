import {
  History as HistoryIcon,
  PowerSettingsNewSharp as PowerSettingsNewSharpIcon,
  SmartToyOutlined as SmartToyOutlinedIcon,
} from '@mui/icons-material'
import { FC, useContext, useState } from 'react'
import ReactConfetti from 'react-confetti'
import { useNavigate } from 'react-router-dom'

import { Button, TextInput } from '@/components'
import { BotContext } from '@/providers/bot'
import { NotificationContext } from '@/providers/notification'
import { LINKS } from '@/router'
import { getLabels, Labels } from '@/utils/labels'

const TopBar: FC<{
  name: string
  image?: string
  description?: string
  isActive: boolean
}> = ({ name, description, image, isActive }) => {
  const navigate = useNavigate()
  const { showLoading } = useContext(NotificationContext)
  const { bot, updateBot, deployBot } = useContext(BotContext)

  const [botName, setBotName] = useState(name)
  const [botDescription, setBotDescription] = useState(description)
  const [botImage, setBotImage] = useState(image)
  const [celebrate, setCelebrate] = useState(false)

  const onNameChange = (name: string) => {
    if (bot) {
      updateBot({ ...bot, name })
    }
  }

  const onDescriptionChange = (description?: string) => {
    if (bot) {
      updateBot({ ...bot, description })
    }
  }

  const onImageChange = (image?: string) => {
    if (bot) {
      updateBot({ ...bot, image })
    }
  }

  const onHistoryClick = () => {
    if (bot) {
      navigate(LINKS.logs(bot.botId))
    }
  }

  const onToggleBot = () => {
    if (bot) {
      showLoading(true)
      deployBot({ ...bot, active: !bot.active }).then(() => showLoading(false))
    }
  }

  return (
    <>
      {celebrate && (
        <ReactConfetti
          recycle={false}
          onConfettiComplete={() => setCelebrate(false)}
        />
      )}
      <div className="d-flex justify-content-between mx-3">
        <div className="d-flex w-100 text-primary align-items-center">
          <SmartToyOutlinedIcon color="secondary" />
          <TextInput
            value={botName}
            className="w-100 mx-2"
            variant="fs-3 text-primary"
            placeholder={labels.namePlaceholder}
            onChange={(value) => setBotName(value)}
            onBlur={() => onNameChange(botName)}
          />
        </div>
        <div className="d-flex">
          <Button
            iconButton
            onClick={onHistoryClick}
            tooltip={labels.historyTooltip}
            icon={<HistoryIcon color="secondary" />}
          />
          <Button
            iconButton
            onClick={onToggleBot}
            tooltip={isActive ? labels.turnOffTooltip : labels.turnOnTooltip}
            icon={
              <PowerSettingsNewSharpIcon
                color={isActive ? 'info' : 'secondary'}
              />
            }
          ></Button>
        </div>
      </div>
      <div className="d-flex align-items-center">
        {botImage && (
          <div style={{ width: 50 }} className="m-3">
            <img width={50} src={botImage} alt="Bot icon" />
          </div>
        )}
        <div className="w-100">
          <TextInput
            className="mx-2"
            variant="text-primary"
            value={botDescription}
            placeholder={labels.description}
            onChange={(value) => setBotDescription(value)}
            onBlur={() => onDescriptionChange(botDescription)}
          />
          <TextInput
            className="mx-2"
            variant="fs-6 text-primary"
            value={botImage}
            placeholder={labels.icon}
            onChange={(value) => setBotImage(value)}
            onBlur={() => onImageChange(botImage)}
          />
        </div>
      </div>
    </>
  )
}

export default TopBar

const LABELS: Labels = {
  en: {
    namePlaceholder: "Bot's name",
    historyTooltip: 'History',
    turnOnTooltip: 'Turn on',
    turnOffTooltip: 'Turn off',
    description: 'Description',
    icon: 'Icon url',
  },
  pt: {
    namePlaceholder: 'Nome do bot',
    historyTooltip: 'Histórico',
    turnOnTooltip: 'Ativar',
    turnOffTooltip: 'Desativar',
    description: 'Descrição',
    icon: 'Url do ícone',
  },
}

const labels = getLabels(LABELS)

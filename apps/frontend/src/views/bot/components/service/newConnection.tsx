import { Add as AddIcon } from '@mui/icons-material'
import { FC, useContext } from 'react'
import { getConnectorByAppId } from '@baita/shared'

import { Button, OptionsInput } from '@/components'
import { IAppConnection } from '@baita/shared'
import { AuthContext } from '@/providers/auth'
import { NotificationContext } from '@/providers/notification'
import { UserContext } from '@/providers/user'
import { getLabels, Labels } from '@/utils/labels'
import { buildOAuthUrl } from '@/utils/oauth'
import { useOauthPopup } from '@/utils/useOauthPopup'

const NewConnection: FC<{
  botId: string
  appId: string
  connectionId?: string | number
  taskIndex: number
  onNewConnectionAttempt: () => void
  onSelectConnection: (appConnection: IAppConnection) => void
}> = ({
  botId,
  appId,
  connectionId,
  taskIndex,
  onNewConnectionAttempt,
  onSelectConnection,
}) => {
  const { user } = useContext(AuthContext)
  const { showSnack } = useContext(NotificationContext)
  const { connections } = useContext(UserContext)

  const connector = getConnectorByAppId(appId)

  const openOauth = useOauthPopup((created) => {
    if (created) {
      showSnack(labels.newConnectionSuccess, 'success')
    } else {
      showSnack(labels.newConnectionCancelled, 'warning')
    }
    onNewConnectionAttempt()
  })

  const handleOauthClick = () => {
    if (!connector || connector.auth.type !== 'oauth2') return

    const state = `${appId}:${user?.userId}:${botId}:${taskIndex}:${connector.id}`
    openOauth(buildOAuthUrl(connector, state))
  }

  return (
    <>
      {connections &&
        connections.filter((x) => x.appId === appId).length > 0 && (
          <OptionsInput
            key={connectionId}
            className="mt-3"
            label={labels.chooseAccount}
            value={
              connectionId
                ? connections.find((x) => x.connectionId === connectionId)
                    ?.name || ''
                : ''
            }
            options={connections.filter((x) => x.appId === appId)}
            optionLabelPath={'name'}
            onChange={onSelectConnection}
          />
        )}

      <div className="d-flex justify-content-center mt-3">
        <Button
          type="text"
          color="primary"
          icon={<AddIcon />}
          onClick={handleOauthClick}
        >
          {labels.newConnection}
        </Button>
      </div>
    </>
  )
}

export default NewConnection

const LABELS: Labels = {
  en: {
    chooseAccount: 'Choice a account',
    newConnection: 'New connection',
    newConnectionSuccess: 'Connection created successfully :)',
    newConnectionCancelled: 'Connection was not completed',
  },
  pt: {
    chooseAccount: 'Escolha uma conta',
    newConnection: 'Nova conexão',
    newConnectionSuccess: 'Conexão criada com sucesso :)',
    newConnectionCancelled: 'Conexão não foi concluída',
  },
}

const labels = getLabels(LABELS)

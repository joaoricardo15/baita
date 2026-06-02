import {
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
} from '@mui/material'
import { FC, useContext, useRef } from 'react'
import { getAllConnectors } from '@baita/shared'

import { AuthContext } from '../../../providers/auth'
import { UserContext } from '../../../providers/user'
import { NotificationContext } from '../../../providers/notification'
import { configMapping } from '../../../utils/config'
import { getLabels, Labels } from '../../../utils/labels'
import ApiRequest from '../../../utils/requests'
import { useOauthPopup } from '../../../utils/useOauthPopup'

const OAUTH_CALLBACK_URL = `${configMapping['www.baita.help'].apiUrl}/connectors/oauth`

const AddConnection: FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { user } = useContext(AuthContext)
  const { connections, retrieveConnections } = useContext(UserContext)
  const { showSnack } = useContext(NotificationContext)
  const apiRequest = ApiRequest()

  const connectors = getAllConnectors()
  const countBeforeRef = useRef(0)

  const onPopupClose = () => {
    apiRequest
      .getAppConnections()
      .then((freshConnections) => {
        if (freshConnections.length > countBeforeRef.current) {
          showSnack(labels.success, 'success')
        } else {
          showSnack(labels.cancelled, 'warning')
        }
        retrieveConnections()
      })
      .catch(() => retrieveConnections())
    onClose()
  }

  const openOauth = useOauthPopup(onPopupClose)

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId)
    if (!connector || connector.auth.type !== 'oauth2') return

    countBeforeRef.current = connections?.length ?? 0

    const { auth, appId } = connector
    const state = `${appId}:${user?.userId}::0:${connectorId}`
    const scopes = auth.scopes.join(' ')

    const params = new URLSearchParams({
      client_id: auth.clientId,
      redirect_uri: OAUTH_CALLBACK_URL,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state,
    })

    openOauth(`${auth.authorizationUrl}?${params.toString()}`)
  }

  const grouped = connectors.reduce(
    (acc, connector) => {
      if (!acc[connector.category]) acc[connector.category] = []
      acc[connector.category].push(connector)
      return acc
    },
    {} as Record<string, typeof connectors>
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{labels.title}</DialogTitle>
      <DialogContent>
        <List>
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <ListSubheader>{category}</ListSubheader>
              {items
                .filter((c) => c.auth.type === 'oauth2')
                .map((connector) => (
                  <ListItemButton
                    key={connector.id}
                    onClick={() => handleConnect(connector.id)}
                  >
                    <ListItemText primary={connector.name} />
                  </ListItemButton>
                ))}
            </div>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  )
}

export default AddConnection

const LABELS: Labels = {
  en: {
    title: 'Add Connection',
    success: 'Connection created successfully',
    cancelled: 'Connection was not completed',
  },
  pt: {
    title: 'Adicionar Conexão',
    success: 'Conexão criada com sucesso',
    cancelled: 'Conexão não foi concluída',
  },
}

const labels = getLabels(LABELS)

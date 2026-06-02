import {
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
} from '@mui/material'
import { FC, useContext } from 'react'
import { getAllConnectors } from '@baita/shared'

import { AuthContext } from '@/providers/auth'
import { NotificationContext } from '@/providers/notification'
import { getLabels, Labels } from '@/utils/labels'
import { buildOAuthUrl } from '@/utils/oauth'
import { useOauthPopup } from '@/utils/useOauthPopup'

const AddConnection: FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { user } = useContext(AuthContext)
  const { showSnack } = useContext(NotificationContext)

  const connectors = getAllConnectors()

  const openOauth = useOauthPopup((created) => {
    showSnack(
      created ? labels.success : labels.cancelled,
      created ? 'success' : 'warning'
    )
    onClose()
  })

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId)
    if (!connector || connector.auth.type !== 'oauth2') return

    const state = `${connector.appId}:${user?.userId}::0:${connectorId}`
    openOauth(buildOAuthUrl(connector, state))
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
                    {connector.icon && (
                      <img
                        src={connector.icon}
                        alt=""
                        style={{ width: 20, height: 20, marginRight: 10 }}
                      />
                    )}
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

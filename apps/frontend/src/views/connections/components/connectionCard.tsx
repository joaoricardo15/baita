import { getConnectorByAppId } from '@baita/shared'
import { IAppConnection } from '@baita/shared'
import {
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Error as ErrorIcon,
  MoreVert as MoreVertIcon,
  Sync as SyncIcon,
} from '@mui/icons-material'
import { Card, Chip } from '@mui/material'
import { FC, useContext, useState } from 'react'

import { Text } from '@/components'
import Menu from '@/components/menu'
import { NotificationContext } from '@/providers/notification'
import { UserContext } from '@/providers/user'
import { getLabels, Labels } from '@/utils/labels'
import ApiRequest from '@/utils/requests'

type HealthStatus = 'idle' | 'checking' | 'healthy' | 'expired' | 'error'

const ConnectionCard: FC<{ connection: IAppConnection }> = ({ connection }) => {
  const apiRequest = ApiRequest()
  const { deleteConnection } = useContext(UserContext)
  const { showSnack } = useContext(NotificationContext)

  const connector = getConnectorByAppId(connection.appId)

  const [healthStatus, setHealthStatus] = useState<HealthStatus>('idle')

  const handleTest = () => {
    setHealthStatus('checking')
    apiRequest
      .healthCheckConnection(String(connection.connectionId))
      .then((result) => setHealthStatus(result.status as HealthStatus))
      .catch(() => setHealthStatus('error'))
  }

  const handleDelete = () => {
    deleteConnection(String(connection.connectionId))
      .then(() => showSnack(labels.deleteSuccess, 'success'))
      .catch(() => showSnack(labels.deleteError, 'error'))
  }

  const getStatusChip = () => {
    switch (healthStatus) {
      case 'checking':
        return (
          <Chip
            size="small"
            icon={<SyncIcon className="animate-spin" />}
            label={labels.checking}
          />
        )
      case 'healthy':
        return (
          <Chip
            size="small"
            color="success"
            icon={<CheckCircleIcon />}
            label={labels.healthy}
          />
        )
      case 'expired':
      case 'error':
        return (
          <Chip
            size="small"
            color="error"
            icon={<ErrorIcon />}
            label={healthStatus === 'expired' ? labels.expired : labels.error}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      <Card className="p-2">
        <div className="d-flex justify-content-between">
          <div className="d-flex">
            {connector?.icon && (
              <div
                style={{ width: 30 }}
                className="m-2 d-flex align-items-center"
              >
                <img width={30} height={30} src={connector.icon} alt="" />
              </div>
            )}
            <div className="mx-2" style={{ margin: 'auto' }}>
              <div className="d-flex align-items-center">
                <Text className="fw-bold align-self-center">
                  {connection.name}
                </Text>
                {getStatusChip()}
              </div>
              {connection.email && (
                <Text className="fw-light fs-6">{connection.email}</Text>
              )}
            </div>
          </div>
          <Menu
            links={[
              {
                label: labels.test,
                icon: <SyncIcon color="secondary" />,
                onClick: handleTest,
              },
              {
                label: labels.delete,
                icon: <DeleteIcon color="secondary" />,
                onClick: handleDelete,
              },
            ]}
          >
            <MoreVertIcon />
          </Menu>
        </div>
      </Card>
    </>
  )
}

export default ConnectionCard

const LABELS: Labels = {
  en: {
    test: 'Test',
    checking: 'Checking...',
    healthy: 'Connected',
    expired: 'Expired',
    error: 'Error',
    delete: 'Delete',
    deleteSuccess: 'Connection deleted',
    deleteError: 'Could not delete connection',
  },
  pt: {
    test: 'Testar',
    checking: 'Verificando...',
    healthy: 'Conectado',
    expired: 'Expirado',
    error: 'Erro',
    delete: 'Excluir',
    deleteSuccess: 'Conexao excluida',
    deleteError: 'Nao foi possivel excluir a conexao',
  },
}

const labels = getLabels(LABELS)

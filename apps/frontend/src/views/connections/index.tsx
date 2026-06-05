import { withAuthenticationRequired } from '@auth0/auth0-react'
import {
  Add as AddIcon,
  CableOutlined as CableOutlinedIcon,
} from '@mui/icons-material'
import { FC, useState } from 'react'

import { Button, EmptyState, Loading, Skeleton } from '@/components'
import { useConnections } from '@/hooks/useConnections'
import { getLabels, Labels } from '@/utils/labels'

import AddConnection from './components/addConnection'
import ConnectionCard from './components/connectionCard'

export const Connections: FC = () => {
  const { data: connections, isLoading: loading } = useConnections()
  const [showAdd, setShowAdd] = useState(false)

  if (loading || connections === undefined) {
    return <Skeleton elements={3} height={100} />
  }

  return (
    <>
      {connections.length === 0 ? (
        <EmptyState
          icon={<CableOutlinedIcon style={{ fontSize: 48 }} />}
          title={labels.empty}
          description={labels.emptyHint}
        />
      ) : (
        connections.map((connection) => (
          <div className="mb-2" key={String(connection.connectionId)}>
            <ConnectionCard connection={connection} />
          </div>
        ))
      )}

      <div className="d-flex align-items-center justify-content-center mt-5">
        <Button
          type="text"
          color="primary"
          icon={<AddIcon />}
          onClick={() => setShowAdd(true)}
        >
          {labels.addConnection}
        </Button>
      </div>

      <AddConnection open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  )
}

export default withAuthenticationRequired(Connections, {
  onRedirecting: () => <Loading />,
})

const LABELS: Labels = {
  en: {
    empty: 'No connections yet',
    emptyHint: 'Connect your first app to get started',
    addConnection: 'Add connection',
  },
  pt: {
    empty: 'Nenhuma conexao ainda',
    emptyHint: 'Conecte seu primeiro app para comecar',
    addConnection: 'Adicionar conexao',
  },
}

const labels = getLabels(LABELS)

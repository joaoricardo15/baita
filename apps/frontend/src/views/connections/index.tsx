import { withAuthenticationRequired } from '@auth0/auth0-react'
import { Add as AddIcon } from '@mui/icons-material'
import { Fab } from '@mui/material'
import { FC, useContext, useState } from 'react'

import { Loading, Skeleton, Text } from '../../components'
import { UserContext } from '../../providers/user'
import { getLabels, Labels } from '../../utils/labels'
import AddConnection from './components/addConnection'
import ConnectionCard from './components/connectionCard'

export const Connections: FC = () => {
  const { connections } = useContext(UserContext)
  const [showAdd, setShowAdd] = useState(false)

  if (connections === undefined) {
    return (
      <div className="d-flex flex-column m-2">
        <Skeleton elements={3} height={72} className="w-100 mb-2" />
      </div>
    )
  }

  return (
    <>
      <Fab
        color="primary"
        style={{ position: 'absolute', right: 10 }}
        onClick={() => setShowAdd(true)}
      >
        <AddIcon />
      </Fab>

      <Text className="fw-bold mb-3" type="h6">
        {labels.title}
      </Text>

      {connections.length === 0 ? (
        <div className="text-center mt-5">
          <Text color="textSecondary">{labels.empty}</Text>
          <Text color="textSecondary" className="mt-1">
            {labels.emptyHint}
          </Text>
        </div>
      ) : (
        <div className="d-flex flex-column">
          {connections.map((connection) => (
            <ConnectionCard
              key={String(connection.connectionId)}
              connection={connection}
            />
          ))}
        </div>
      )}

      <AddConnection open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  )
}

export default withAuthenticationRequired(Connections, {
  onRedirecting: () => <Loading />,
})

const LABELS: Labels = {
  en: {
    title: 'Connections',
    empty: 'No connections yet',
    emptyHint: 'Connect your first app to get started',
  },
  pt: {
    title: 'Conexões',
    empty: 'Nenhuma conexão ainda',
    emptyHint: 'Conecte seu primeiro app para começar',
  },
}

const labels = getLabels(LABELS)

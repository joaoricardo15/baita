import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material'
import { FC, useContext } from 'react'

import { Highlight, StatusChip, Text } from '../../../components'
import { IBotLog } from '../../../models/bot'
import { AuthContext } from '../../../providers/auth'
import { getLabels, Labels } from '../../../utils/labels'

const Log: FC<{ botLog: IBotLog }> = ({ botLog }) => {
  const { isAdmin } = useContext(AuthContext)

  return (
    <div className="mb-5" key={botLog.timestamp}>
      <Accordion>
        <AccordionSummary disabled>
          <Text>
            {`${botLog.usage} ${labels.header} ${
              botLog.usage > 1 ? 's' : ''
            }, ${new Date(botLog.timestamp)}`}
          </Text>
        </AccordionSummary>
      </Accordion>
      {botLog.logs.map((log) => (
        <Accordion key={`${log.name}-${log.timestamp}`}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <StatusChip status={log.status} />
            <Text className="mx-3 align-self-center">{log.name}</Text>
          </AccordionSummary>
          <AccordionDetails className="d-block">
            {isAdmin && log.inputData && (
              <>
                <Text className="mb-1">{labels.inputData}</Text>
                {log.inputData ? <Highlight data={log.inputData} /> : ''}
              </>
            )}
            {log.outputData && (
              <>
                <Text className="mb-1">{labels.outputData}</Text>
                <Highlight data={log.outputData} />
              </>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  )
}

export default Log

const LABELS: Labels = {
  en: {
    header: 'task',
    inputData: 'Input',
    outputData: 'Output',
  },
  pt: {
    header: 'tarefa',
    inputData: 'Entrada',
    outputData: 'Saída',
  },
}

const labels = getLabels(LABELS)

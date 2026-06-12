import { FileCopy as FileCopyIcon } from '@mui/icons-material'
import { FC, useContext } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { Button } from '@/components'
import { NotificationContext } from '@/providers/notification'
import { computeRunUrl } from '@/utils/bot'
import { getLabels, Labels } from '@/utils/labels'

const WebhookService: FC<{ botId: string; userId: string }> = ({
  botId,
  userId,
}) => {
  const { showSnack } = useContext(NotificationContext)
  const runUrl = computeRunUrl(botId, userId)

  return (
    <div className="d-flex flex-column align-items-center my-3 w-100">
      <div className="d-flex align-items-center w-100 p-2 bg-light rounded">
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            wordBreak: 'break-all',
            flex: 1,
            minWidth: 0,
          }}
        >
          <span className="fw-bold">{labels.url}</span>
          {runUrl}
        </div>
        <div className="ms-2" style={{ flexShrink: 0 }}>
          <CopyToClipboard
            text={runUrl}
            onCopy={() => showSnack(labels.urlCopiedToClipboard, 'success')}
          >
            <Button iconButton icon={<FileCopyIcon />} />
          </CopyToClipboard>
        </div>
      </div>
    </div>
  )
}

export default WebhookService

const LABELS: Labels = {
  en: {
    url: 'URL: ',
    urlCopiedToClipboard: 'URL copied to clipboard',
  },
  pt: {
    url: 'URL: ',
    urlCopiedToClipboard: 'URL copiada para área de transferência',
  },
}

const labels = getLabels(LABELS)

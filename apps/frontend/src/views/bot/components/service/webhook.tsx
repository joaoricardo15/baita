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
    <div
      className="d-flex justify-content-center my-3 align-middle"
      style={{ alignItems: 'center' }}
    >
      <div>
        {labels.url}
        {runUrl}
      </div>
      <div className="mx-3">
        <CopyToClipboard
          text={runUrl}
          onCopy={() => showSnack(labels.urlCopiedToClipboard, 'success')}
        >
          <Button iconButton icon={<FileCopyIcon />} />
        </CopyToClipboard>
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

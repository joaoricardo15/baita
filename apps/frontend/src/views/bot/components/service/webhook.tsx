import { FileCopy as FileCopyIcon } from '@mui/icons-material'
import { FC, useContext } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { Button } from '@/components'
import { NotificationContext } from '@/providers/notification'
import { getLabels, Labels } from '@/utils/labels'

const WebhookService: FC<{ triggerUrl: string }> = ({ triggerUrl }) => {
  const { showSnack } = useContext(NotificationContext)

  return (
    <div
      className="d-flex justify-content-center my-3 align-middle"
      style={{ alignItems: 'center' }}
    >
      <div>
        {labels.triggerUrl}
        {triggerUrl}
      </div>
      <div className="mx-3">
        <CopyToClipboard
          text={triggerUrl}
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
    triggerUrl: 'URL: ',
    urlCopiedToClipboard: 'URL copied to clipboard',
  },
  pt: {
    triggerUrl: 'URL: ',
    urlCopiedToClipboard: 'URL copiada para área de transferência',
  },
}

const labels = getLabels(LABELS)

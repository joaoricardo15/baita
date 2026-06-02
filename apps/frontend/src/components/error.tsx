import { Modal } from '@mui/material'
import { FC, useState } from 'react'

import { getLabels, Labels } from '@/utils/labels'
import { ComponentProps, Text } from '.'
import Button from './button'

const ErrorComponent: FC<
  {
    errorMessage?: string
    buttonCallback: () => void
  } & ComponentProps
> = ({ errorMessage, buttonCallback, style, className }) => {
  const [open, setOpen] = useState<boolean>(true)

  return (
    <Modal open={open}>
      <div
        className={`${className} bg-white mt-5 p-4 rounded`}
        style={{ ...style, width: '500px', margin: 'auto' }}
      >
        <div>
          <Text type="h4">{labels.errorMessageHading}</Text>
          <Text className="mt-5">{errorMessage}</Text>
          <Button
            type="text"
            className="mt-5"
            onClick={() => {
              setOpen(false)
              buttonCallback()
            }}
          >
            {labels.tryAgainButton}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ErrorComponent

const LABELS: Labels = {
  en: {
    errorMessageHading: 'Error!!!',
    tryAgainButton: 'Try Again',
  },
  pt: {
    errorMessageHading: 'Error!!!',
    tryAgainButton: 'Tentar novamente',
  },
}

const labels = getLabels(LABELS)

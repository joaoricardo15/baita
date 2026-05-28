import { FC } from 'react'

import { Text } from '../components'
import { getLabels, Labels } from '../utils/labels'

const NotFound: FC = () => {
  return (
    <div className="d-flex justify-content-center">
      <Text type="h6" className="mt-5">
        {labels.notFound}
      </Text>
    </div>
  )
}

export default NotFound

const LABELS: Labels = {
  en: {
    notFound: 'Page not found 🤷‍♂️',
  },
  pt: {
    notFound: 'Página não encontrada 🤷‍♂️',
  },
}

const labels = getLabels(LABELS)

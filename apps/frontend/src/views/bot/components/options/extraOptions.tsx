import { ITask, ITaskCondition } from '@baita/shared'
import { FC } from 'react'

import { CheckBox } from '@/components'
import { getLabels, Labels } from '@/utils/labels'

import { newEmptyCondition } from './filterConditions'

const ExtraOptions: FC<{
  task: ITask
  showReturnDataOption: boolean
  onTaskFieldChange: (fieldName: string, value: unknown) => void
}> = ({ task, showReturnDataOption, onTaskFieldChange }) => {
  const onConditionsOptionChange = (checked: boolean) => {
    const initialConditions: ITaskCondition[][] = [[newEmptyCondition]]

    onTaskFieldChange('conditions', !checked ? undefined : initialConditions)
  }

  const onReturnDataOptionChange = () => {
    onTaskFieldChange('returnData', !task.returnData)
  }

  return (
    <>
      <CheckBox
        label={labels.conditionsOption}
        checked={!!task.conditions}
        onChange={onConditionsOptionChange}
      />
      {showReturnDataOption && (
        <CheckBox
          label={labels.returnDataOption}
          checked={!!task.returnData}
          onChange={onReturnDataOptionChange}
        />
      )}
    </>
  )
}

export default ExtraOptions

const LABELS: Labels = {
  en: {
    conditionsOption: 'Only executes if',
    returnDataOption: 'Retrieve data on trigger response',
  },
  pt: {
    conditionsOption: 'Execute somente se',
    returnDataOption: 'Retornar dados como resposta da requisição',
  },
}

const labels = getLabels(LABELS)

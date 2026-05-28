import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { Divider } from '@mui/material'
import { FC } from 'react'

import {
  Button,
  OptionsInput,
  TextInput,
  VariableInput,
} from '../../../../components'
import {
  ConditionOperator,
  ITask,
  ITaskCondition,
} from '../../../../models/bot'
import { IVariable, VariableType } from '../../../../models/service'
import { getLabels, Labels } from '../../../../utils/labels'

export const newEmptyCondition: ITaskCondition = {
  operator: ConditionOperator.exists,
  operand: {
    name: '',
    label: '',
    type: VariableType.output,
  },
}

const FilterConditions: FC<{
  task: ITask
  taskIndex: number
  inputs: IVariable[]
  onTaskFieldChange: (fieldName: string, value: any) => void
}> = ({ task, taskIndex, inputs, onTaskFieldChange }) => {
  const addOrCondition = () => {
    if (task.conditions) {
      onTaskFieldChange('conditions', [...task.conditions, [newEmptyCondition]])
    }
  }

  const deleteOrCondition = (orConditionIndex: number) => {
    if (task.conditions) {
      onTaskFieldChange(
        'conditions',
        task.conditions.filter((_, index) => index !== orConditionIndex)
      )
    }
  }

  const addAndCondition = (orConditionIndex: number) => {
    if (task.conditions) {
      onTaskFieldChange(
        'conditions',
        task.conditions.map((x, index) =>
          index !== orConditionIndex ? x : [...x, newEmptyCondition]
        )
      )
    }
  }

  const deleteAndCondition = (
    orConditionIndex: number,
    andConditionIndex: number
  ) => {
    if (task.conditions) {
      onTaskFieldChange(
        'conditions',
        task.conditions.map((or, index) =>
          index !== orConditionIndex
            ? or
            : or.filter((_, index) => index !== andConditionIndex)
        )
      )
    }
  }

  const onValueChange = (
    orConditionIndex: number,
    andConditionIndex: number,
    result: IVariable
  ) => {
    if (task.conditions) {
      onTaskFieldChange(
        'conditions',
        task.conditions.map((or, index) =>
          index !== orConditionIndex
            ? or
            : or.map((and, index) =>
                index !== andConditionIndex ? and : { ...and, operand: result }
              )
        )
      )
    }
  }

  const onOperatorChange = (
    orConditionIndex: number,
    andConditionIndex: number,
    result: {
      label: string
      value: ConditionOperator
    }
  ) => {
    if (task.conditions) {
      onTaskFieldChange(
        'conditions',
        task.conditions.map((or, index) =>
          index !== orConditionIndex
            ? or
            : or.map((and, index) =>
                index !== andConditionIndex
                  ? and
                  : { ...and, operator: result?.value }
              )
        )
      )
    }
  }

  const onComparisonValueChange = (
    orConditionIndex: number,
    andConditionIndex: number,
    result: string
  ) => {
    if (task.conditions) {
      onTaskFieldChange(
        'conditions',
        task.conditions.map((or, index) =>
          index !== orConditionIndex
            ? or
            : or.map((and, index) =>
                index !== andConditionIndex
                  ? and
                  : { ...and, conditionComparisonValue: result }
              )
        )
      )
    }
  }

  const needsComparisonValue = (operator: ConditionOperator) =>
    operator === ConditionOperator.equals ||
    operator === ConditionOperator.notEquals ||
    operator === ConditionOperator.contains ||
    operator === ConditionOperator.startsWith ||
    operator === ConditionOperator.endsWith

  return (
    <>
      {task.conditions &&
        task.conditions.map((orCondition, orConditionIndex) => (
          <div key={`or-${orConditionIndex}`}>
            {orConditionIndex !== 0 && (
              <>
                <Divider className="my-3" />
                <Button
                  type="text"
                  icon={<DeleteIcon />}
                  className="d-flex justify-content-center"
                  onClick={() => deleteOrCondition(orConditionIndex)}
                >
                  {labels.orCondition}
                </Button>
                <Divider className="my-3" />
              </>
            )}
            {orCondition
              .map((andCondition, andConditionIndex) => (
                <div key={`and-${andConditionIndex}`}>
                  <div className="d-flex">
                    <Button
                      iconButton
                      icon={
                        andConditionIndex === 0 ? <AddIcon /> : <DeleteIcon />
                      }
                      onClick={() =>
                        andConditionIndex === 0
                          ? addAndCondition(orConditionIndex)
                          : deleteAndCondition(
                              orConditionIndex,
                              andConditionIndex
                            )
                      }
                    />
                    <VariableInput
                      className="col-5"
                      // Review that
                      label={andCondition.operand.label}
                      value={andCondition.operand.value as string}
                      variable={andCondition.operand}
                      onChange={(result) =>
                        onValueChange(
                          orConditionIndex,
                          andConditionIndex,
                          result
                        )
                      }
                      outputFields={inputs.filter(
                        (x) =>
                          x.outputIndex !== undefined &&
                          x.outputIndex < taskIndex
                      )}
                    />
                    <OptionsInput
                      className="mx-2 col"
                      value={andCondition.operator}
                      label={labels.comparison}
                      optionLabelPath={'label'}
                      onChange={(result) =>
                        onOperatorChange(
                          orConditionIndex,
                          andConditionIndex,
                          result
                        )
                      }
                      options={Object.values(ConditionOperator).map((x) => ({
                        value: x,
                        label: x,
                      }))}
                    />
                    {andCondition.operator &&
                      needsComparisonValue(andCondition.operator) && (
                        <TextInput
                          value={
                            andCondition.comparisonOperand?.value as string
                          }
                          label={labels.reference}
                          onChange={(result) =>
                            onComparisonValueChange(
                              orConditionIndex,
                              andConditionIndex,
                              result
                            )
                          }
                        />
                      )}
                  </div>
                  {andConditionIndex !== 0 && (
                    <div className="d-flex justify-content-center my-2">
                      {labels.andCondition}
                    </div>
                  )}
                </div>
              ))
              .reverse()}
            <Button
              type="text"
              icon={<AddIcon />}
              className="d-flex justify-content-center mt-3"
              onClick={addOrCondition}
            >
              {labels.orCondition}
            </Button>
            <Divider className="my-3" />
          </div>
        ))}
    </>
  )
}

export default FilterConditions

const LABELS: Labels = {
  en: {
    orCondition: 'OR',
    andCondition: 'AND',
    value: 'Value',
    comparison: 'Comparison',
    reference: 'Reference',
  },
  pt: {
    orCondition: 'OU',
    andCondition: 'E',
    value: 'Valor',
    comparison: 'Comparação',
    reference: 'Referência',
  },
}

const labels = getLabels(LABELS)

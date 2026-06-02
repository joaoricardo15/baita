import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material'
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'

import { Button, Text } from '@/components'
import { ITask, removeStepReferences } from '@baita/shared'
import { ServiceName, ServiceType } from '@baita/shared'
import { BotContext } from '@/providers/bot'
import { getLabels, Labels } from '@/utils/labels'
import TaskInput from './input'
import TaskOptions from './options'
import TaskService from './service'
import TaskTest from './test'

const Task: FC<{
  taskIndex: number
  isSelected?: boolean
  onSelect?: () => void
}> = ({ taskIndex, isSelected, onSelect }) => {
  const { bot, updateBot } = useContext(BotContext)

  const [task, setTask] = useState<ITask>()
  const [openedPanel, setOpenedPanel] = useState<string>()

  const onPanelChange =
    (panel: string) =>
    (_: React.SyntheticEvent<Element, Event>, isExpanded: boolean) => {
      setOpenedPanel(isExpanded ? panel : undefined)
    }

  const addTask = (taskIndex: number) => {
    if (bot) {
      bot.tasks.splice(taskIndex + 1, 0, {
        taskId: Date.now(),
        inputData: [],
      })
      updateBot({ ...bot })
    }
  }

  const deleteTask = (taskId: number) => {
    if (bot) {
      const { tasks } = removeStepReferences(bot.tasks, taskId)
      updateBot({ ...bot, tasks })
    }
  }

  useEffect(() => {
    if (bot) {
      setTask(bot.tasks[taskIndex])
    }
  }, [bot])

  return (
    <div
      className="mt-4"
      onClick={onSelect}
      style={{
        borderLeft: isSelected ? '2px solid #90caf9' : '2px solid transparent',
        paddingLeft: 8,
        cursor: 'pointer',
      }}
    >
      {bot && task && (
        <>
          <div className="d-flex justify-content-between">
            {/***** Task Title *****/}
            {taskIndex === 0 ? (
              <Text className="mx-2 text-primary fw-bold">
                {labels.triggerTitle}
              </Text>
            ) : (
              <div className="d-flex w-100 justify-content-between">
                <div className="d-flex">
                  <Button
                    iconButton
                    onClick={() => deleteTask(task.taskId)}
                    icon={
                      <DeleteIcon
                        className="fs-3 bg-light p-1"
                        style={{ borderRadius: 4 }}
                      />
                    }
                  />
                  <div className="d-flex align-items-center mx-1">
                    <Text className="text-primary fs-4 fw-bold">
                      {taskIndex}
                    </Text>
                    {task.app?.icon && (
                      <img
                        src={task.app.icon}
                        alt=""
                        style={{ width: 16, height: 16, marginLeft: 6 }}
                      />
                    )}
                    <Text
                      className=" text-primary fw-bold mx-1"
                      style={{ fontSize: 14 }}
                    >
                      {task.service ? task.service.label : '...'}
                    </Text>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/***** Service *****/}
          <Accordion
            className="mt-2"
            expanded={openedPanel === `${taskIndex}-s`}
            onChange={onPanelChange(`${taskIndex}-s`)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              {labels.serviceTitle}
            </AccordionSummary>
            <AccordionDetails>
              <TaskService taskIndex={taskIndex} />
            </AccordionDetails>
          </Accordion>

          {/***** Show only after selecting a service that does not require a connection,
           ****** or after selecting/creating a connectionId *****/}
          {task.service &&
            (!task.app?.config?.auth?.url || task.connectionId) && (
              <>
                {/***** Input *****/}
                {(task.service.config.inputFields ||
                  task.service.config.customFields) && (
                  <Accordion
                    expanded={openedPanel === `${taskIndex}-i`}
                    onChange={onPanelChange(`${taskIndex}-i`)}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      {labels.inputDataTitle}
                    </AccordionSummary>
                    <AccordionDetails className="d-block">
                      <TaskInput taskIndex={taskIndex} />
                    </AccordionDetails>
                  </Accordion>
                )}

                {/***** Options *****/}
                {task.service.type !== ServiceType.trigger && (
                  <Accordion
                    expanded={openedPanel === `${taskIndex}-o`}
                    onChange={onPanelChange(`${taskIndex}-o`)}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      {labels.optionsTitle}
                    </AccordionSummary>
                    <AccordionDetails className="d-block">
                      <TaskOptions taskIndex={taskIndex} />
                    </AccordionDetails>
                  </Accordion>
                )}

                {/***** Test *****/}
                {(task.service.type !== ServiceType.trigger ||
                  task.service.name !== ServiceName.schedule) && (
                  <Accordion
                    expanded={openedPanel === `${taskIndex}-t`}
                    onChange={onPanelChange(`${taskIndex}-t`)}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      {labels.testTitle}
                    </AccordionSummary>
                    <AccordionDetails className="d-block">
                      <TaskTest taskIndex={taskIndex} />
                    </AccordionDetails>
                  </Accordion>
                )}
              </>
            )}

          {/***** Bottom buttons tab *****/}
          <div className="d-flex justify-content-center mt-4">
            <Button
              size="small"
              icon={<AddIcon />}
              onClick={() => addTask(taskIndex)}
            >
              {labels.addTask}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default Task

const LABELS: Labels = {
  en: {
    triggerTitle: 'Trigger',
    serviceTitle: 'Service',
    inputDataTitle: 'Input Data',
    addTask: 'Add Task',
    optionsTitle: 'Options',
    testTitle: 'Tests',
  },
  pt: {
    triggerTitle: 'Gatilho',
    serviceTitle: 'Serviço',
    inputDataTitle: 'Dados de entrada',
    addTask: 'Adicionar Tarefa',
    optionsTitle: 'Opções',
    testTitle: 'Testes',
  },
}

const labels = getLabels(LABELS)

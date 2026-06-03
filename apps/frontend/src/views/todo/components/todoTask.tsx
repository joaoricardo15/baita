import type { DraggableSyntheticListeners } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Delete as DeleteIcon,
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material'
import { createContext, FC, useContext, useMemo, useState } from 'react'

import { CheckBox, TextInput } from '@/components'
import { ITodoTask } from '@baita/shared'
import { NotificationContext } from '@/providers/notification'
import { UserContext } from '@/providers/user'

interface Context {
  attributes: Record<string, any>
  listeners: DraggableSyntheticListeners
  ref(node: HTMLElement | null): void
}

const SortableItemContext = createContext<Context>({
  attributes: {},
  listeners: undefined,
  ref() {},
})

const DragHandle: FC = () => {
  const { attributes, listeners, ref } = useContext(SortableItemContext)

  return (
    <div
      ref={ref}
      {...listeners}
      {...attributes}
      style={{ paddingLeft: 15, paddingRight: 10, touchAction: 'none' }}
    >
      <DragIndicatorIcon color="primary" style={{ width: 15 }} />
    </div>
  )
}

export const ToDoTask: FC<{
  task: ITodoTask
  prefixChain?: string
}> = ({ task, prefixChain }) => {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.taskId })
  const context = useMemo(
    () => ({
      attributes,
      listeners,
      ref: setActivatorNodeRef,
    }),
    [attributes, listeners, setActivatorNodeRef]
  )
  const { todoTasks, setTodoTasks, updateTodoTasks } = useContext(UserContext)
  const { showSnack } = useContext(NotificationContext)

  const [editMode, setEditMode] = useState(false)
  const [taskTitle, setTaskTitle] = useState(task.title)

  const onTaskDoneChange = () => {
    if (todoTasks && !task.done) {
      const updatedTasks = todoTasks.map((t) =>
        t.taskId === task.taskId
          ? { ...t, done: true, updatedAt: Date.now() }
          : t
      )
      setTodoTasks(updatedTasks)
      updateTodoTasks(updatedTasks)
      showSnack(task.title, 'success')
    }
  }

  const onTaskTitleFocus = () => {
    if (prefixChain) {
      setTaskTitle(`${prefixChain}/${task.title}`)
    }
    setEditMode(true)
  }

  const onTaskTitleChange = (result: string) => {
    setTaskTitle(result)
  }

  const onTaskTitleBlur = () => {
    if (todoTasks && !task.done) {
      setTimeout(() => setEditMode(false), 100)
      const updatedTasks = todoTasks.map((t) =>
        t.taskId === task.taskId ? { ...t, title: taskTitle } : t
      )
      setTodoTasks(updatedTasks)
      updateTodoTasks(updatedTasks)

      if (prefixChain && taskTitle.startsWith(`${prefixChain}/`)) {
        const newSuffix = taskTitle.replace(`${prefixChain}/`, '')
        setTaskTitle(newSuffix)
      }
    }
  }

  const onDeleteTask = () => {
    if (todoTasks) {
      const updatedTasks = todoTasks.filter((t) => t.taskId !== task.taskId)
      setTodoTasks(updatedTasks)
      updateTodoTasks(updatedTasks)
    }
  }

  return (
    <SortableItemContext.Provider value={context}>
      <div
        ref={setNodeRef}
        className={`d-flex align-items-center`}
        style={{
          opacity: isDragging ? 0.4 : undefined,
          transform: CSS.Translate.toString(transform),
          transition,
        }}
      >
        <DragHandle />
        <div className="d-flex w-100 align-items-center">
          <CheckBox
            checked={task.done}
            className="text-primary"
            onChange={() => onTaskDoneChange()}
          />
          <TextInput
            value={taskTitle}
            className="w-100"
            onBlur={() => onTaskTitleBlur()}
            onFocus={() => onTaskTitleFocus()}
            onChange={(result) => onTaskTitleChange(result)}
          />
          {editMode && (
            <div className="mx-2" onClick={() => onDeleteTask()}>
              <DeleteIcon color="secondary" className="fs-5" />
            </div>
          )}
        </div>
      </div>
    </SortableItemContext.Provider>
  )
}

export default ToDoTask

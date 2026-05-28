import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext } from '@dnd-kit/sortable'
import { FC } from 'react'

import { Text } from '../../../components'
import { ITodoTask, ITodoTaskGroup } from '../../../models/user'
import ToDoTask from './todoTask'

export const ToDoList: FC<{
  tasks: ITodoTask[]
  onChange: (tasks: ITodoTask[]) => void
}> = ({ tasks, onChange }) => {
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over?.id) {
      const activeIndex = tasks.findIndex(({ taskId }) => taskId === active.id)
      const overIndex = tasks.findIndex(({ taskId }) => taskId === over.id)

      onChange(arrayMove(tasks, activeIndex, overIndex))
    }
  }

  /*
    Split the tasks into dynamic groups. Each group will be implemented as a separate list.
    Groups can have multiple layers of prefixes, so the groups are nested (recursive).
    The groups are created based on the prefixes of the task titles.
    If a task has a title like 'work/task1/abc', it will be within group 'work' and 'task1' and not have the prefixes under its new name.
    Each group contains tasks with its 'title' starting with the same prefix using '/' as divider.
    For example, tasks with taskId 'work/task1' and 'work/task2' will be in the same group.
    If there is no prefix, the task will be in a group with an empty string as the key
  
    Example:
    tasks = [
      { taskId: '122', title: 'task0' },
      { taskId: '123', title: 'house/task1' },
      { taskId: '124', title: 'house/task2' },
      { taskId: '125', title: 'house/kitchen/task3' },
      { taskId: '126', title: 'house/kitchen/task4' },
    ]

    groupList = [
    {
        "prefix": "",
        "tasks": [
            {
                "taskId": "122",
                "title": "task0"
            }
        ]
    },
    {
        "prefix": "house",
        "tasks": [
            {
                "taskId": "123",
                "title": "task1"
            },
            {
                "taskId": "124",
                "title": "task2"
            }
        ],
        "groups": [
            {
                "prefix": "kitchen",
                "tasks": [
                    {
                        "taskId": "125",
                        "title": "kitchen/task3"
                    },
                    {
                        "taskId": "126",
                        "title": "kitchen/task4"
                    }
                ]
            }
        ]
    }]
  */

  // Helper function to recursively group tasks by prefix
  /**
   * Groups a flat list of tasks into hierarchical groups based on prefixes in their titles.
   *
   * Each task title can contain a prefix separated by a slash (e.g., "WORK/Task 1").
   * The function recursively groups tasks by their prefixes, creating nested groups for tasks
   * with multiple levels of prefixes.
   *
   * @param tasks - An array of `ITodoTask` objects to be grouped.
   * @returns An array of `ITodoTaskGroup` objects, each representing a group of tasks with the same prefix.
   *          Nested groups are created for tasks with further prefixes in their titles.
   */
  const groupTasks = (tasks: ITodoTask[]) => {
    const groups: { [prefix: string]: ITodoTask[] } = {}
    const rootTasks: ITodoTask[] = []

    // Iterate through tasks and split them into root tasks and grouped tasks
    tasks.forEach((task) => {
      const parts = task.title.split('/')
      if (parts.length === 1) {
        rootTasks.push(task)
      } else {
        const [rawPrefix, ...rest] = parts
        const prefix = rawPrefix.toUpperCase()
        const newTask = { ...task, title: rest.join('/') }
        if (!groups[prefix]) groups[prefix] = []
        groups[prefix].push(newTask)
      }
    })

    const groupList: ITodoTaskGroup[] = []

    // If there are root tasks, add them to the group list
    if (rootTasks.length > 0) {
      groupList.push({
        prefix: '',
        tasks: rootTasks,
      })
    }

    // Iterate through the grouped tasks and create the final groups list
    // Tasks with the same prefix and no further prefix will be grouped together
    // Tasks with further prefixes will be grouped recursively
    Object.entries(groups).forEach(([prefix, groupedTasks]) => {
      groupList.push({
        prefix,
        tasks: groupedTasks.filter((t) => !t.title.includes('/')),
        groups:
          groupedTasks.filter((t) => t.title.includes('/')).length > 0
            ? groupTasks(groupedTasks.filter((t) => t.title.includes('/')))
            : undefined,
      })
    })

    return groupList
  }

  // Recursive render for nested groups
  const renderGroups = (groups: ITodoTaskGroup[], level = 0, prefix = '') => {
    return groups.map((group, index) => {
      // Builds a parent-child prefix chain by joining the current prefix with the group's prefix
      const prefixChain = [prefix, group.prefix].filter(Boolean).join('/')

      return (
        <div key={group.prefix + index} style={{ paddingLeft: level * 40 }}>
          {/* Render group's title */}
          {group.prefix && (
            <div className="d-flex align-items-center pt-4 px-3">
              <Text className="fw-light lh-base" style={{ fontSize: 8 }}>
                {group.prefix}
              </Text>
              <div
                className="mx-3 flex-fill"
                style={{ height: 1, background: '#e0e0e0' }}
              />
            </div>
          )}

          {/* Render group's tasks */}
          <DndContext onDragEnd={onDragEnd}>
            <SortableContext items={group.tasks.map((task) => task.taskId)}>
              {group.tasks.map((task) => (
                <ToDoTask
                  task={task}
                  key={task.taskId}
                  prefixChain={prefixChain}
                />
              ))}
            </SortableContext>
          </DndContext>
          {group.groups && renderGroups(group.groups, level + 1, prefixChain)}
        </div>
      )
    })
  }

  const groupList = groupTasks(tasks)

  return <>{renderGroups(groupList)}</>
}

export default ToDoList

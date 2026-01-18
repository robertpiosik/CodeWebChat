import { useEffect, useRef } from 'react'
import { Task } from '@shared/types/task'

export const use_auto_focus_new_task = (
  tasks: Task[],
  set_editing_timestamp: (timestamp: number | null) => void
) => {
  const prev_ids_ref = useRef<Set<number>>(new Set())
  const is_first_render = useRef(true)

  useEffect(() => {
    const current_ids = new Set<number>()
    const id_to_task = new Map<number, Task>()

    const collect_ids = (t: Task[]) => {
      t.forEach((task) => {
        current_ids.add(task.created_at)
        id_to_task.set(task.created_at, task)
        if (task.children) collect_ids(task.children)
      })
    }
    collect_ids(tasks)

    if (is_first_render.current) {
      is_first_render.current = false
      prev_ids_ref.current = current_ids
      return
    }

    const added_ids = Array.from(current_ids).filter(
      (id) => !prev_ids_ref.current.has(id)
    )

    if (added_ids.length == 1) {
      const new_task = id_to_task.get(added_ids[0])
      if (new_task && new_task.text == '') {
        set_editing_timestamp(added_ids[0])
      }
    }

    prev_ids_ref.current = current_ids
  }, [tasks, set_editing_timestamp])
}

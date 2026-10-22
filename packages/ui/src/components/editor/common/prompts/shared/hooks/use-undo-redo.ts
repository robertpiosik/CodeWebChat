import { useState, useCallback, useRef, useEffect, RefObject } from 'react'

export type HistoryEntry = {
  value: string
  raw_caret_pos: number
}

export const use_undo_redo = (params: {
  value: string
  raw_caret_pos_ref: RefObject<number>
  on_change: (new_value: string) => void
  on_restore?: (entry: HistoryEntry) => void
}) => {
  const params_ref = useRef(params)
  useEffect(() => {
    params_ref.current = params
  }, [params])

  const [undo_stack, set_undo_stack] = useState<HistoryEntry[]>([])
  const [redo_stack, set_redo_stack] = useState<HistoryEntry[]>([])

  const save_history = useCallback(
    (custom_value?: string, custom_caret_pos?: number) => {
      const p = params_ref.current
      set_undo_stack((prev) => [
        ...prev,
        {
          value: custom_value !== undefined ? custom_value : p.value,
          raw_caret_pos:
            custom_caret_pos !== undefined
              ? custom_caret_pos
              : p.raw_caret_pos_ref.current ?? 0
        }
      ])
      set_redo_stack([])
    },
    []
  )

  const undo = useCallback(() => {
    const p = params_ref.current
    if (undo_stack.length > 0) {
      const prev_entry = undo_stack[undo_stack.length - 1]
      set_undo_stack((prev) => prev.slice(0, -1))
      set_redo_stack((prev) => [
        ...prev,
        {
          value: p.value,
          raw_caret_pos: p.raw_caret_pos_ref.current ?? 0
        }
      ])
      p.on_change(prev_entry.value)
      if (p.on_restore) {
        p.on_restore(prev_entry)
      }
      return true
    }
    return false
  }, [undo_stack])

  const redo = useCallback(() => {
    const p = params_ref.current
    if (redo_stack.length > 0) {
      const next_entry = redo_stack[redo_stack.length - 1]
      set_redo_stack((prev) => prev.slice(0, -1))
      set_undo_stack((prev) => [
        ...prev,
        {
          value: p.value,
          raw_caret_pos: p.raw_caret_pos_ref.current ?? 0
        }
      ])
      p.on_change(next_entry.value)
      if (p.on_restore) {
        p.on_restore(next_entry)
      }
      return true
    }
    return false
  }, [redo_stack])

  return {
    undo_stack,
    redo_stack,
    save_history,
    undo,
    redo,
    set_undo_stack,
    set_redo_stack
  }
}

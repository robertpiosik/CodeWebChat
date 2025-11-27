import { createContext } from 'react'

type LayoutContextType = {
  can_undo: boolean
  has_changes_to_commit: boolean
  on_apply_click: () => void
  on_undo_click: () => void
  on_commit_click: () => void
  commit_button_enabling_trigger_count: number
}

export const LayoutContext = createContext<LayoutContextType>({
  can_undo: false,
  has_changes_to_commit: false,
  on_apply_click: () => {},
  on_undo_click: () => {},
  on_commit_click: () => {},
  commit_button_enabling_trigger_count: 0
})

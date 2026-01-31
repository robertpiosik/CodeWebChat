import { createContext } from 'react'

type LayoutContextType = {
  can_undo: boolean
  on_apply_click: () => void
  on_undo_click: () => void
  apply_button_enabling_trigger_count: number
}

export const LayoutContext = createContext<LayoutContextType>({
  can_undo: false,
  on_apply_click: () => {},
  on_undo_click: () => {},
  apply_button_enabling_trigger_count: 0
})

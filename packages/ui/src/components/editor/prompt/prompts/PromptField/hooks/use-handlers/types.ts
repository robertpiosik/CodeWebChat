import { RefObject, MutableRefObject, Dispatch, SetStateAction } from 'react'
import type { PromptFieldProps } from '../../PromptField'

export type HistoryEntry = {
  value: string
  raw_caret_pos: number
}

export type HandlerContext = {
  props: PromptFieldProps
  params: {
    input_ref: RefObject<HTMLDivElement>
    ghost_text: string
    on_accept_ghost_text: () => void
    set_caret_position: (pos: number) => void
  }
  refs: {
    props_ref: MutableRefObject<PromptFieldProps>
    raw_caret_pos_ref: MutableRefObject<number>
    has_modified_current_entry_ref: MutableRefObject<boolean>
    is_shift_pressed_ref: MutableRefObject<boolean>
    space_timeout_ref: MutableRefObject<ReturnType<typeof setTimeout> | null>
    is_recording_from_space_ref: MutableRefObject<boolean>
    on_recording_finished_ref: MutableRefObject<() => void>
  }
  state: {
    history_index: number
    set_history_index: Dispatch<SetStateAction<number>>
    is_history_enabled: boolean
    undo_stack: HistoryEntry[]
    set_undo_stack: Dispatch<SetStateAction<HistoryEntry[]>>
    redo_stack: HistoryEntry[]
    set_redo_stack: Dispatch<SetStateAction<HistoryEntry[]>>
  }
  utils: {
    update_value: (new_value: string, caret_pos?: number) => void
    handle_symbol_deletion_by_click: (element: HTMLElement) => void
    handle_backspace_key: (e: React.KeyboardEvent<HTMLDivElement>) => void
    perform_paste: (text: string) => void
  }
}

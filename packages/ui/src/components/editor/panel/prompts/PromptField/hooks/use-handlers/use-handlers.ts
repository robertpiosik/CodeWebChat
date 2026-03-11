import { RefObject, useState, useEffect, useRef } from 'react'
import type { PromptFieldProps } from '../../PromptField'
import {
  get_caret_position_from_div,
  set_caret_position_for_div,
  map_display_pos_to_raw_pos,
  map_raw_pos_to_display_pos,
  use_symbol_deletion
} from '../../../shared/symbols'
import { HandlerContext, HistoryEntry } from './types'
import { set_caret_position_after_change } from './utils'
import { create_handle_copy } from './handle-copy'
import { create_handle_cut } from './handle-cut'
import { create_perform_paste, create_handle_paste } from './handle-paste'
import { create_handle_input_click } from './handle-input-click'
import { create_handle_input_change } from './handle-input-change'
import { create_handle_submit } from './handle-submit'
import { create_handle_key_down } from './handle-key-down'

export const use_handlers = (
  props: PromptFieldProps,
  params: {
    input_ref: RefObject<HTMLDivElement>
    ghost_text: string
    on_accept_ghost_text: () => void
    set_caret_position: (pos: number) => void
  }
) => {
  const props_ref = useRef(props)
  props_ref.current = props

  const [history_index, set_history_index] = useState(-1)
  const [is_history_enabled, set_is_history_enabled] = useState(!props.value)
  const [undo_stack, set_undo_stack] = useState<HistoryEntry[]>([])
  const [redo_stack, set_redo_stack] = useState<HistoryEntry[]>([])
  const raw_caret_pos_ref = useRef(0)
  const has_modified_current_entry_ref = useRef(false)
  const is_shift_pressed_ref = useRef(false)
  const space_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null)
  const is_recording_from_space_ref = useRef(false)
  const on_recording_finished_ref = useRef(props.on_recording_finished)

  useEffect(() => {
    on_recording_finished_ref.current = props.on_recording_finished
  }, [props.on_recording_finished])

  useEffect(() => {
    const handle_key_down = (e: KeyboardEvent) => {
      if (e.key == 'Shift') is_shift_pressed_ref.current = true
    }
    const handle_key_up = (e: KeyboardEvent) => {
      if (e.key == 'Shift') is_shift_pressed_ref.current = false
      if (e.key == ' ') {
        if (space_timeout_ref.current) {
          clearTimeout(space_timeout_ref.current)
          space_timeout_ref.current = null
        }
        if (is_recording_from_space_ref.current) {
          on_recording_finished_ref.current()
          is_recording_from_space_ref.current = false
        }
      }
    }
    const handle_blur = () => {
      is_shift_pressed_ref.current = false
      if (space_timeout_ref.current) {
        clearTimeout(space_timeout_ref.current)
        space_timeout_ref.current = null
      }
      if (is_recording_from_space_ref.current) {
        on_recording_finished_ref.current()
        is_recording_from_space_ref.current = false
      }
    }
    window.addEventListener('keydown', handle_key_down)
    window.addEventListener('keyup', handle_key_up)
    window.addEventListener('blur', handle_blur)

    return () => {
      window.removeEventListener('keydown', handle_key_down)
      window.removeEventListener('keyup', handle_key_up)
      window.removeEventListener('blur', handle_blur)
    }
  }, [])

  useEffect(() => {
    if (!props.value) {
      has_modified_current_entry_ref.current = false
      set_is_history_enabled(true)
    }

    const on_selection_change = () => {
      if (
        document.activeElement === params.input_ref.current &&
        params.input_ref.current
      ) {
        const selection = window.getSelection()
        const pos = get_caret_position_from_div(params.input_ref.current)
        params.set_caret_position(pos)

        const raw_pos = map_display_pos_to_raw_pos({
          display_pos: pos,
          raw_text: props.value,
          context_file_paths: props.context_file_paths ?? []
        })
        raw_caret_pos_ref.current = raw_pos
        props.on_caret_position_change(raw_pos)

        const is_at_end =
          raw_pos == props.value.length && !!selection?.isCollapsed

        const is_history_check_enabled =
          is_at_end && !has_modified_current_entry_ref.current
        set_is_history_enabled(is_history_check_enabled)
      }
    }
    document.addEventListener('selectionchange', on_selection_change)
    on_selection_change()
    return () =>
      document.removeEventListener('selectionchange', on_selection_change)
  }, [
    props.value,
    props.context_file_paths,
    params.input_ref,
    props.on_caret_position_change,
    params.set_caret_position
  ])

  useEffect(() => {
    if (params.input_ref.current) {
      if (
        props.caret_position_to_set !== undefined &&
        props.on_caret_position_set
      ) {
        const caret_pos = props.caret_position_to_set
        const on_set = props.on_caret_position_set
        setTimeout(() => {
          if (params.input_ref.current) {
            const display_pos = map_raw_pos_to_display_pos({
              raw_pos: caret_pos,
              raw_text: props.value,
              context_file_paths: props.context_file_paths ?? []
            })
            set_caret_position_for_div(params.input_ref.current, display_pos)
            on_set()
          }
        }, 0)
      }
    }
  }, [
    props.caret_position_to_set,
    props.on_caret_position_set,
    props.value,
    props.context_file_paths
  ])

  useEffect(() => {
    if (params.input_ref.current && !props.missing_configuration) {
      requestAnimationFrame(() => {
        if (!params.input_ref.current) return
        params.input_ref.current.focus({ preventScroll: true })
      })
    }
  }, [props.focus_key, props.missing_configuration])

  useEffect(() => {
    if (params.input_ref.current && !props.missing_configuration) {
      requestAnimationFrame(() => {
        if (!params.input_ref.current) return
        params.input_ref.current.focus({ preventScroll: true })
        const selection = window.getSelection()
        if (selection) {
          const range = document.createRange()
          range.selectNodeContents(params.input_ref.current)
          if (!params.input_ref.current.textContent) {
            range.collapse(true)
          }
          selection.removeAllRanges()
          selection.addRange(range)
        }
      })
    }
  }, [
    props.focus_and_select_key,
    props.missing_configuration,
    props.prompt_type
  ])

  const update_value = (new_value: string, caret_pos?: number) => {
    if (new_value === props.value) return
    set_undo_stack((prev) => [
      ...prev,
      { value: props.value, raw_caret_pos: raw_caret_pos_ref.current }
    ])
    set_redo_stack([])
    props.on_change(new_value)
    if (caret_pos !== undefined) {
      set_caret_position_after_change({
        input_ref: params.input_ref,
        new_raw_cursor_pos: caret_pos,
        new_value,
        context_file_paths: props.context_file_paths ?? []
      })
    }
  }

  const { handle_symbol_deletion_by_click, handle_backspace_key } =
    use_symbol_deletion({
      value: props.value,
      context_file_paths: props.context_file_paths ?? [],
      input_ref: params.input_ref,
      on_delete: (new_value, new_caret_pos) => {
        has_modified_current_entry_ref.current = new_value != ''
        update_value(new_value, new_caret_pos)
      }
    })

  const ctx: HandlerContext = {
    props,
    params,
    refs: {
      props_ref,
      raw_caret_pos_ref,
      has_modified_current_entry_ref,
      is_shift_pressed_ref,
      space_timeout_ref,
      is_recording_from_space_ref,
      on_recording_finished_ref
    },
    state: {
      history_index,
      set_history_index,
      is_history_enabled,
      undo_stack,
      set_undo_stack,
      redo_stack,
      set_redo_stack
    },
    utils: {
      update_value,
      handle_symbol_deletion_by_click,
      handle_backspace_key,
      perform_paste: () => {}
    }
  }

  const perform_paste = create_perform_paste(ctx)
  ctx.utils.perform_paste = perform_paste

  const handle_copy = create_handle_copy(ctx)
  const handle_cut = create_handle_cut(ctx)
  const handle_paste = create_handle_paste(ctx, perform_paste)
  const handle_input_click = create_handle_input_click(ctx)
  const handle_input_change = create_handle_input_change(ctx)
  const handle_submit = create_handle_submit(ctx)
  const handle_key_down = create_handle_key_down(ctx, handle_submit)

  return {
    handle_input_change,
    handle_submit,
    handle_key_down,
    handle_copy,
    handle_cut,
    handle_paste,
    handle_input_click
  }
}

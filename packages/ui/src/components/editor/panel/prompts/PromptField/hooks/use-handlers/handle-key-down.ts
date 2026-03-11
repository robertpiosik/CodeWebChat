import { map_display_pos_to_raw_pos } from '../../../shared/symbols'
import { HandlerContext } from './types'
import { get_symbol_ranges, set_caret_position_after_change } from './utils'

export const create_handle_key_down = (
  ctx: HandlerContext,
  handle_submit: (
    e:
      | React.KeyboardEvent<HTMLDivElement>
      | React.MouseEvent<HTMLButtonElement>,
    with_control?: boolean
  ) => void
) => {
  const { props, params, refs, state, utils } = ctx

  const handle_history_navigation = (
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    const active_history = props.chat_history

    if (active_history.length == 0) return

    e.preventDefault()

    const update_and_set_caret = (value: string) => {
      refs.has_modified_current_entry_ref.current = false
      utils.update_value(value, value.length)
    }

    if (e.key == 'ArrowUp') {
      if (state.history_index < active_history.length - 1) {
        const new_index = state.history_index + 1
        state.set_history_index(new_index)
        update_and_set_caret(active_history[new_index])
      }
    } else if (e.key == 'ArrowDown') {
      if (state.history_index > 0) {
        const new_index = state.history_index - 1
        state.set_history_index(new_index)
        update_and_set_caret(active_history[new_index])
      } else if (state.history_index == 0) {
        state.set_history_index(-1)
        update_and_set_caret('')
      }
    }
  }

  const handle_record_toggle_key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (props.is_recording) {
      props.on_recording_finished()
    } else {
      props.on_recording_started()
    }
  }

  const handle_space_key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.repeat) {
      e.preventDefault()
      return true
    }
    if (refs.space_timeout_ref.current) {
      clearTimeout(refs.space_timeout_ref.current)
    }
    refs.space_timeout_ref.current = setTimeout(() => {
      refs.props_ref.current.on_recording_started()
      refs.is_recording_from_space_ref.current = true

      const current_raw_pos = refs.raw_caret_pos_ref.current
      const value = refs.props_ref.current.value

      if (
        current_raw_pos >= 2 &&
        value.substring(current_raw_pos - 2, current_raw_pos) == '  '
      ) {
        const new_value =
          value.substring(0, current_raw_pos - 1) +
          value.substring(current_raw_pos)

        state.set_undo_stack((prev) => [
          ...prev,
          { value, raw_caret_pos: current_raw_pos }
        ])
        state.set_redo_stack([])
        refs.props_ref.current.on_change(new_value)
        refs.has_modified_current_entry_ref.current = new_value != ''
        set_caret_position_after_change({
          input_ref: params.input_ref,
          new_raw_cursor_pos: current_raw_pos - 1,
          new_value,
          context_file_paths: refs.props_ref.current.context_file_paths ?? []
        })
      }
    }, 300)
    return false
  }

  const handle_copy_key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount == 0 || selection.isCollapsed) {
      e.preventDefault()
      props.on_copy()
      return true
    }
    return false
  }

  const handle_paste_key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    navigator.clipboard.readText().then((text) => {
      utils.perform_paste(text)
    })
  }

  const handle_word_jump_left_key = (
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    e.preventDefault()
    const raw_pos = refs.raw_caret_pos_ref.current
    if (raw_pos == 0) return

    const { value, context_file_paths = [] } = props
    let i = raw_pos - 1

    while (i >= 0 && /\s/.test(value[i])) {
      i--
    }
    if (i < 0) {
      set_caret_position_after_change({
        input_ref: params.input_ref,
        new_raw_cursor_pos: 0,
        new_value: value,
        context_file_paths
      })
      return
    }

    const symbol_ranges = get_symbol_ranges({
      text: value,
      context_file_paths
    })
    let new_raw_pos: number | undefined

    for (const range of symbol_ranges) {
      if (i >= range.start && i < range.end) {
        new_raw_pos = range.start
        break
      }
    }

    if (new_raw_pos === undefined) {
      const is_word_char = /\w/.test(value[i])
      while (i >= 0) {
        const current_is_word = /\w/.test(value[i])
        if (/\s/.test(value[i]) || current_is_word != is_word_char) {
          break
        }
        i--
      }
      new_raw_pos = i + 1
    }

    set_caret_position_after_change({
      input_ref: params.input_ref,
      new_raw_cursor_pos: new_raw_pos,
      new_value: value,
      context_file_paths
    })
  }

  const handle_word_jump_right_key = (
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    e.preventDefault()
    const { value, context_file_paths = [] } = props
    const raw_pos = refs.raw_caret_pos_ref.current
    if (raw_pos == value.length) return

    let i = raw_pos

    while (i < value.length && /\s/.test(value[i])) {
      i++
    }

    const symbol_ranges = get_symbol_ranges({
      text: value,
      context_file_paths
    })
    let new_raw_pos: number | undefined

    for (const range of symbol_ranges) {
      if (i >= range.start && i < range.end) {
        new_raw_pos = range.end
        break
      }
    }

    if (new_raw_pos === undefined) {
      const is_word_char = /\w/.test(value[i])
      while (i < value.length) {
        const current_is_word = /\w/.test(value[i])
        if (/\s/.test(value[i]) || current_is_word !== is_word_char) {
          break
        }
        i++
      }
      new_raw_pos = i
    }

    set_caret_position_after_change({
      input_ref: params.input_ref,
      new_raw_cursor_pos: new_raw_pos,
      new_value: value,
      context_file_paths
    })
  }

  const handle_undo_key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (state.undo_stack.length > 0) {
      const prev_entry = state.undo_stack[state.undo_stack.length - 1]
      state.set_undo_stack((prev) => prev.slice(0, -1))
      state.set_redo_stack((prev) => [
        ...prev,
        {
          value: props.value,
          raw_caret_pos: refs.raw_caret_pos_ref.current
        }
      ])
      props.on_change(prev_entry.value)
      set_caret_position_after_change({
        input_ref: params.input_ref,
        new_raw_cursor_pos: prev_entry.raw_caret_pos,
        new_value: prev_entry.value,
        context_file_paths: props.context_file_paths ?? []
      })
      state.set_history_index(-1)
      refs.has_modified_current_entry_ref.current = true
    }
  }

  const handle_redo_key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (state.redo_stack.length > 0) {
      const next_entry = state.redo_stack[state.redo_stack.length - 1]
      state.set_redo_stack((prev) => prev.slice(0, -1))
      state.set_undo_stack((prev) => [
        ...prev,
        {
          value: props.value,
          raw_caret_pos: refs.raw_caret_pos_ref.current
        }
      ])
      props.on_change(next_entry.value)
      set_caret_position_after_change({
        input_ref: params.input_ref,
        new_raw_cursor_pos: next_entry.raw_caret_pos,
        new_value: next_entry.value,
        context_file_paths: props.context_file_paths ?? []
      })
      state.set_history_index(-1)
      refs.has_modified_current_entry_ref.current = true
    }
  }

  const handle_tab_key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (params.ghost_text) {
      e.preventDefault()
      params.on_accept_ghost_text()
    }
  }

  const handle_backspace_action = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!props.value) {
      e.preventDefault()
      return
    }

    const selection = window.getSelection()
    if (
      selection &&
      selection.rangeCount > 0 &&
      !selection.isCollapsed &&
      params.input_ref.current?.contains(selection.getRangeAt(0).startContainer)
    ) {
      e.preventDefault()
      const range = selection.getRangeAt(0)
      const input_element = params.input_ref.current

      const pre_selection_range = document.createRange()
      pre_selection_range.selectNodeContents(input_element)
      pre_selection_range.setEnd(range.startContainer, range.startOffset)
      const display_start = pre_selection_range.toString().length

      pre_selection_range.setEnd(range.endContainer, range.endOffset)
      const display_end = pre_selection_range.toString().length

      const raw_start = map_display_pos_to_raw_pos({
        display_pos: display_start,
        raw_text: props.value,
        context_file_paths: props.context_file_paths ?? []
      })
      const raw_end = map_display_pos_to_raw_pos({
        display_pos: display_end,
        raw_text: props.value,
        context_file_paths: props.context_file_paths ?? []
      })

      const new_value =
        props.value.substring(0, raw_start) + props.value.substring(raw_end)

      refs.has_modified_current_entry_ref.current = true
      utils.update_value(new_value, raw_start)
      return
    }

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const raw_pos = refs.raw_caret_pos_ref.current
      if (raw_pos == 0) return

      const value = props.value
      let i = raw_pos - 1

      while (i >= 0 && /\s/.test(value[i])) {
        i--
      }

      if (i >= 0) {
        const is_word_char = /\w/.test(value[i])
        while (i >= 0) {
          const current_is_word = /\w/.test(value[i])
          if (/\s/.test(value[i]) || current_is_word !== is_word_char) {
            break
          }
          i--
        }
      }

      const new_start_pos = i + 1
      const new_value =
        value.substring(0, new_start_pos) + value.substring(raw_pos)
      refs.has_modified_current_entry_ref.current = new_value != ''
      utils.update_value(new_value, new_start_pos)
      return
    }

    utils.handle_backspace_key(e)
  }

  const handle_enter_key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (props.send_with_shift_enter && e.shiftKey) {
      e.preventDefault()
      handle_submit(e)
    } else if (!props.send_with_shift_enter && !e.shiftKey) {
      e.preventDefault()
      handle_submit(e)
    } else {
      e.preventDefault()
      const selection = window.getSelection()
      if (!selection || !selection.rangeCount || !params.input_ref.current)
        return

      const range = selection.getRangeAt(0)
      const input_element = params.input_ref.current

      if (!input_element.contains(range.startContainer)) return

      const pre_selection_range = document.createRange()
      pre_selection_range.selectNodeContents(input_element)
      pre_selection_range.setEnd(range.startContainer, range.startOffset)
      const display_start = pre_selection_range.toString().length

      pre_selection_range.setEnd(range.endContainer, range.endOffset)
      const display_end = pre_selection_range.toString().length

      const raw_start = map_display_pos_to_raw_pos({
        display_pos: display_start,
        raw_text: props.value,
        context_file_paths: props.context_file_paths ?? []
      })
      const raw_end = map_display_pos_to_raw_pos({
        display_pos: display_end,
        raw_text: props.value,
        context_file_paths: props.context_file_paths ?? []
      })

      const new_value =
        props.value.substring(0, raw_start) +
        '\n' +
        props.value.substring(raw_end)

      refs.has_modified_current_entry_ref.current = true
      utils.update_value(new_value, raw_start + 1)
    }
  }

  const handle_escape_key = () => {
    if (props.is_recording) {
      props.on_recording_finished()
    } else {
      params.input_ref.current?.blur()
    }
  }

  return (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { key, shiftKey } = e

    if (key != ' ' && refs.space_timeout_ref.current) {
      clearTimeout(refs.space_timeout_ref.current)
      refs.space_timeout_ref.current = null
    }

    if ((e.ctrlKey || e.metaKey) && shiftKey && e.code == 'Space') {
      handle_record_toggle_key(e)
      return
    }

    if (key == ' ' && !e.ctrlKey && !e.metaKey && !e.altKey && !shiftKey) {
      if (handle_space_key(e)) return
    }

    if ((e.ctrlKey || e.metaKey) && !shiftKey && key.toLowerCase() == 'c') {
      if (handle_copy_key(e)) return
    }

    if ((e.ctrlKey || e.metaKey) && shiftKey && key.toLowerCase() == 'v') {
      handle_paste_key(e)
      return
    }

    if ((e.ctrlKey || e.metaKey) && !shiftKey) {
      if (key == 'ArrowLeft') {
        handle_word_jump_left_key(e)
        return
      }

      if (key == 'ArrowRight') {
        handle_word_jump_right_key(e)
        return
      }
    }

    if ((e.ctrlKey || e.metaKey) && !shiftKey && key.toLowerCase() == 'z') {
      handle_undo_key(e)
      return
    }

    if (
      ((e.ctrlKey || e.metaKey) && key.toLowerCase() == 'y') ||
      ((e.ctrlKey || e.metaKey) && shiftKey && key.toLowerCase() == 'z')
    ) {
      handle_redo_key(e)
      return
    }

    if (key == 'Tab' && !shiftKey) {
      handle_tab_key(e)
      return
    }

    if (key == 'Backspace') {
      handle_backspace_action(e)
      return
    }

    if (key == 'Enter') {
      handle_enter_key(e)
      return
    }

    if ((key == 'ArrowUp' || key == 'ArrowDown') && state.is_history_enabled) {
      handle_history_navigation(e)
      return
    }

    if (key == 'Escape') {
      handle_escape_key()
      return
    }
  }
}

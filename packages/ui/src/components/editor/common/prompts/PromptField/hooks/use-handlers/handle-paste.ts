import { get_raw_selection_bounds } from '../../../shared/symbols'
import { HandlerContext } from './types'
import { get_symbol_ranges } from './utils'

export const create_perform_paste =
  ({ props, params, refs, utils }: HandlerContext) =>
  (text: string) => {
    const input_element = params.input_ref.current
    if (!input_element) return

    const bounds = get_raw_selection_bounds({
      input_element,
      raw_text: props.value,
      context_file_paths: props.selected_files ?? []
    })
    if (!bounds) return
    const { raw_start, raw_end } = bounds

    let text_to_insert = text
    let caret_offset_adjustment = 0

    const is_file_in_context =
      props.currently_open_file_path !== undefined &&
      (props.selected_files ?? []).includes(props.currently_open_file_path)

    if (
      !refs.is_shift_pressed_ref.current &&
      props.current_selection &&
      text === props.current_selection.text &&
      text.length > 1 &&
      props.currently_open_file_path &&
      is_file_in_context
    ) {
      const { start_line, start_col, end_line, end_col } =
        props.current_selection
      text_to_insert = `#Fragment(${props.currently_open_file_path}:${start_line}:${start_col}-${end_line}:${end_col})`
    }

    const new_value =
      props.value.substring(0, raw_start) +
      text_to_insert +
      props.value.substring(raw_end)
    const new_caret_pos =
      raw_start + text_to_insert.length + caret_offset_adjustment

    refs.has_modified_current_entry_ref.current = true
    utils.update_value(new_value, new_caret_pos)
  }

export const create_handle_paste =
  (
    { props, params, refs, utils }: HandlerContext,
    perform_paste: (text: string) => void
  ) =>
  (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()

    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0]
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            const base64 = event.target.result.toString()
            const commaIndex = base64.indexOf(',')
            if (commaIndex !== -1) {
              const rawBase64 = base64.substring(commaIndex + 1)
              props.on_paste_image(rawBase64)
            }
          }
        }
        reader.readAsDataURL(file)
        return
      }
    }

    const text = e.clipboardData.getData('text/plain')

    if (
      !refs.is_shift_pressed_ref.current &&
      /^https?:\/\/[^\s]+$/.test(text.trim())
    ) {
      props.on_paste_url(text.trim())
      return
    }

    const is_file_in_context =
      props.currently_open_file_path !== undefined &&
      (props.selected_files ?? []).includes(props.currently_open_file_path)

    const is_fragment_paste =
      props.current_selection &&
      text === props.current_selection.text &&
      text.length > 1 &&
      props.currently_open_file_path &&
      is_file_in_context

    const has_symbols =
      get_symbol_ranges({
        text,
        selected_files: props.selected_files ?? [],
        ignore_file_paths: true
      }).length > 0

    const trimmed_text = text.trim()
    const is_single_character_or_number =
      trimmed_text.length === 1 || /^\d+$/.test(trimmed_text)

    if (
      !refs.is_shift_pressed_ref.current &&
      trimmed_text.length > 0 &&
      !is_fragment_paste &&
      !has_symbols &&
      !is_single_character_or_number
    ) {
      const input_element = params.input_ref.current
      if (input_element) {
        const bounds = get_raw_selection_bounds({
          input_element,
          raw_text: props.value,
          context_file_paths: props.selected_files ?? []
        })
        if (bounds && bounds.raw_start !== bounds.raw_end) {
          const new_value =
            props.value.substring(0, bounds.raw_start) + props.value.substring(bounds.raw_end)

          utils.update_value(new_value, bounds.raw_start)
          props.on_caret_position_change(bounds.raw_start)
          refs.raw_caret_pos_ref.current = bounds.raw_start
        }
      }
      props.on_paste_long_text(text)
      return
    }

    perform_paste(text)
  }

import { map_display_pos_to_raw_pos } from '../../../shared/symbols'
import { HandlerContext } from './types'
import { get_symbol_ranges } from './utils'

export const create_perform_paste =
  ({ props, params, refs, utils }: HandlerContext) =>
  (text: string) => {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount || !params.input_ref.current) return
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

    let text_to_insert = text
    let caret_offset_adjustment = 0

    const is_file_in_context =
      props.currently_open_file_path !== undefined &&
      (props.context_file_paths ?? []).includes(props.currently_open_file_path)

    if (
      !refs.is_shift_pressed_ref.current &&
      props.current_selection &&
      text == props.current_selection.text &&
      props.currently_open_file_path &&
      is_file_in_context
    ) {
      const { start_line, start_col, end_line, end_col } =
        props.current_selection
      const is_multiline = text.includes('\n')
      const formatted_text = is_multiline
        ? `\n<![CDATA[\n${text}\n]]>\n`
        : `<![CDATA[${text}]]>`
      text_to_insert = `<fragment path="${props.currently_open_file_path}" start="${start_line}:${start_col}" end="${end_line}:${end_col}">${formatted_text}</fragment>`
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
            if (commaIndex != -1) {
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
      (props.context_file_paths ?? []).includes(props.currently_open_file_path)

    const is_fragment_paste =
      props.current_selection &&
      text == props.current_selection.text &&
      props.currently_open_file_path &&
      is_file_in_context

    const has_symbols =
      get_symbol_ranges({
        text,
        context_file_paths: props.context_file_paths ?? []
      }).length > 0

    if (
      !refs.is_shift_pressed_ref.current &&
      text.includes('\n') &&
      !is_fragment_paste &&
      !has_symbols
    ) {
      const selection = window.getSelection()
      if (
        selection &&
        selection.rangeCount > 0 &&
        !selection.isCollapsed &&
        params.input_ref.current
      ) {
        const range = selection.getRangeAt(0)
        const input_element = params.input_ref.current

        if (input_element.contains(range.startContainer)) {
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

          utils.update_value(new_value, raw_start)
          props.on_caret_position_change(raw_start)
          refs.raw_caret_pos_ref.current = raw_start
        }
      }
      props.on_paste_pasted_text(text)
      return
    }

    perform_paste(text)
  }

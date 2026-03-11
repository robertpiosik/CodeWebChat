import { map_display_pos_to_raw_pos } from '../../../shared/symbols'
import { HandlerContext } from './types'

export const create_handle_copy =
  ({ props, params }: HandlerContext) =>
  (e: React.ClipboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount == 0 || selection.isCollapsed) return

    const range = selection.getRangeAt(0)
    const input_element = params.input_ref.current
    if (!input_element || !input_element.contains(range.startContainer)) return

    e.preventDefault()

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

    const raw_text_slice = props.value.substring(raw_start, raw_end)
    e.clipboardData.setData('text/plain', raw_text_slice)
  }

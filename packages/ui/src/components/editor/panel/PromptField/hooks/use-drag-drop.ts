import { useRef, RefObject } from 'react'
import {
  map_display_pos_to_raw_pos,
  map_raw_pos_to_display_pos
} from '../utils/position-mapping'
import { set_caret_position_for_div } from '../utils/caret'
import type { PromptFieldProps } from '../PromptField'

type UseDragDropParams = {
  input_ref: RefObject<HTMLDivElement>
  value: PromptFieldProps['value']
  context_file_paths: PromptFieldProps['context_file_paths']
  on_change: PromptFieldProps['on_change']
}

export const use_drag_drop = ({
  input_ref,
  value,
  context_file_paths,
  on_change
}: UseDragDropParams) => {
  const dragged_text_range_ref = useRef<{ start: number; end: number } | null>(
    null
  )

  const handle_drag_start = (e: React.DragEvent<HTMLDivElement>) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      e.preventDefault()
      return
    }

    const range = selection.getRangeAt(0)
    const input_element = input_ref.current
    if (!input_element || !input_element.contains(range.startContainer)) return

    // Calculate display positions
    const pre_selection_range = document.createRange()
    pre_selection_range.selectNodeContents(input_element)
    pre_selection_range.setEnd(range.startContainer, range.startOffset)
    const display_start = pre_selection_range.toString().length

    pre_selection_range.setEnd(range.endContainer, range.endOffset)
    const display_end = pre_selection_range.toString().length

    // Map to raw positions
    const raw_start = map_display_pos_to_raw_pos(
      display_start,
      value,
      context_file_paths ?? []
    )
    const raw_end = map_display_pos_to_raw_pos(
      display_end,
      value,
      context_file_paths ?? []
    )

    dragged_text_range_ref.current = { start: raw_start, end: raw_end }
    const dragged_text = value.substring(raw_start, raw_end)
    e.dataTransfer.setData('text/plain', dragged_text)
  }

  const handle_drag_over = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()

    if (!dragged_text_range_ref.current) {
      return
    }

    const range = document.caretRangeFromPoint(e.clientX, e.clientY)
    if (range && input_ref.current?.contains(range.startContainer)) {
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }

  const handle_drop = (e: React.DragEvent<HTMLDivElement>) => {
    // Check for internal drag. If it is, handle it.
    // If not, let the browser handle it. It will fire 'onInput'.
    if (!dragged_text_range_ref.current) {
      return
    }

    e.preventDefault()

    const dragged_range = dragged_text_range_ref.current
    dragged_text_range_ref.current = null

    // Find drop position
    const range = document.caretRangeFromPoint(e.clientX, e.clientY)
    if (!range) return

    const input_element = input_ref.current
    if (!input_element || !input_element.contains(range.startContainer)) return

    const pre_drop_range = document.createRange()
    pre_drop_range.selectNodeContents(input_element)
    pre_drop_range.setEnd(range.startContainer, range.startOffset)
    const display_drop_pos = pre_drop_range.toString().length

    let raw_drop_pos = map_display_pos_to_raw_pos(
      display_drop_pos,
      value,
      context_file_paths ?? []
    )

    const dragged_text = value.substring(dragged_range.start, dragged_range.end)

    if (
      raw_drop_pos >= dragged_range.start &&
      raw_drop_pos <= dragged_range.end
    ) {
      return
    }

    const value_without_dragged =
      value.substring(0, dragged_range.start) +
      value.substring(dragged_range.end)

    if (raw_drop_pos > dragged_range.start) {
      raw_drop_pos -= dragged_text.length
    }

    const new_value =
      value_without_dragged.substring(0, raw_drop_pos) +
      dragged_text +
      value_without_dragged.substring(raw_drop_pos)

    on_change(new_value)

    const new_raw_selection_start = raw_drop_pos
    const new_raw_selection_end = raw_drop_pos + dragged_text.length
    setTimeout(() => {
      if (input_ref.current) {
        const display_start = map_raw_pos_to_display_pos(
          new_raw_selection_start,
          new_value,
          context_file_paths ?? []
        )
        const display_end = map_raw_pos_to_display_pos(
          new_raw_selection_end,
          new_value,
          context_file_paths ?? []
        )
        set_caret_position_for_div(
          input_ref.current,
          display_start,
          display_end
        )
      }
    }, 0)
  }

  const handle_drag_end = () => {
    dragged_text_range_ref.current = null
  }

  return {
    handle_drag_start,
    handle_drag_over,
    handle_drop,
    handle_drag_end
  }
}
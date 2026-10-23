import { useRef, RefObject } from 'react'
import {
  get_raw_selection_bounds,
  map_display_pos_to_raw_pos,
  map_raw_pos_to_display_pos,
  set_caret_position_for_div
} from '../../shared/symbols'
import type { PromptField } from '../PromptField'

export const use_drag_drop = (
  props: PromptField.Props,
  input_ref: RefObject<HTMLDivElement>
) => {
  const dragged_text_range_ref = useRef<{ start: number; end: number } | null>(
    null
  )

  const handle_drag_start = (e: React.DragEvent<HTMLDivElement>) => {
    const input_element = input_ref.current
    if (!input_element) {
      e.preventDefault()
      return
    }

    const bounds = get_raw_selection_bounds({
      input_element,
      raw_text: props.value,
      context_file_paths: props.selected_files ?? []
    })

    if (!bounds || bounds.raw_start === bounds.raw_end) {
      e.preventDefault()
      return
    }

    dragged_text_range_ref.current = { start: bounds.raw_start, end: bounds.raw_end }
    const dragged_text = props.value.substring(bounds.raw_start, bounds.raw_end)
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
    if (!dragged_text_range_ref.current) {
      return
    }

    e.preventDefault()

    const dragged_range = dragged_text_range_ref.current
    dragged_text_range_ref.current = null

    const range = document.caretRangeFromPoint(e.clientX, e.clientY)
    if (!range) return

    const input_element = input_ref.current
    if (!input_element || !input_element.contains(range.startContainer)) return

    const pre_drop_range = document.createRange()
    pre_drop_range.selectNodeContents(input_element)
    pre_drop_range.setEnd(range.startContainer, range.startOffset)
    const display_drop_pos = pre_drop_range.toString().length

    let raw_drop_pos = map_display_pos_to_raw_pos({
      display_pos: display_drop_pos,
      raw_text: props.value,
      context_file_paths: props.selected_files ?? []
    })

    const dragged_text = props.value.substring(
      dragged_range.start,
      dragged_range.end
    )

    if (
      raw_drop_pos >= dragged_range.start &&
      raw_drop_pos <= dragged_range.end
    ) {
      return
    }

    const value_without_dragged =
      props.value.substring(0, dragged_range.start) +
      props.value.substring(dragged_range.end)

    if (raw_drop_pos > dragged_range.start) {
      raw_drop_pos -= dragged_text.length
    }

    const new_value =
      value_without_dragged.substring(0, raw_drop_pos) +
      dragged_text +
      value_without_dragged.substring(raw_drop_pos)

    props.on_change(new_value)

    const new_raw_selection_start = raw_drop_pos
    const new_raw_selection_end = raw_drop_pos + dragged_text.length
    setTimeout(() => {
      if (input_ref.current) {
        const display_start = map_raw_pos_to_display_pos({
          raw_pos: new_raw_selection_start,
          raw_text: new_value,
          context_file_paths: props.selected_files ?? []
        })
        const display_end = map_raw_pos_to_display_pos({
          raw_pos: new_raw_selection_end,
          raw_text: new_value,
          context_file_paths: props.selected_files ?? []
        })
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

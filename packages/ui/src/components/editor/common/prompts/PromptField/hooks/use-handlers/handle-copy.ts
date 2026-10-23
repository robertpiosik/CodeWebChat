import { get_raw_selection_bounds } from '../../../shared/symbols'
import { HandlerContext } from './types'

export const create_handle_copy =
  ({ props, params }: HandlerContext) =>
  (e: React.ClipboardEvent<HTMLDivElement>) => {
    const input_element = params.input_ref.current
    if (!input_element) return
    const bounds = get_raw_selection_bounds({
      input_element,
      raw_text: props.value,
      context_file_paths: props.selected_files ?? []
    })
    if (!bounds || bounds.raw_start === bounds.raw_end) return

    e.preventDefault()

    const raw_text_slice = props.value.substring(bounds.raw_start, bounds.raw_end)
    e.clipboardData.setData('text/plain', raw_text_slice)
  }

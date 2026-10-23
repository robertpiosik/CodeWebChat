import { get_raw_selection_bounds } from '../../../shared/symbols'
import { HandlerContext } from './types'

export const create_handle_cut =
  ({ props, params, refs, utils }: HandlerContext) =>
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

    const new_value =
      props.value.substring(0, bounds.raw_start) + props.value.substring(bounds.raw_end)

    refs.has_modified_current_entry_ref.current = true
    utils.update_value(new_value, bounds.raw_start)
  }

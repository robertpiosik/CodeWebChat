import {
  reconstruct_raw_value_from_node,
  get_caret_position_from_div
} from '../../../shared/symbols'
import { HandlerContext } from './types'

export const create_handle_input_change =
  ({ props, refs, state, utils }: HandlerContext) =>
  (e: React.FormEvent<HTMLDivElement>) => {
    const currentTarget = e.currentTarget
    const new_raw_value = reconstruct_raw_value_from_node(currentTarget)

    if (new_raw_value === props.value) {
      return
    }

    const new_display_value = currentTarget.textContent ?? ''
    const caret_position = get_caret_position_from_div(currentTarget)
    const char_before_caret = new_display_value.charAt(caret_position - 1)

    refs.has_modified_current_entry_ref.current = new_raw_value != ''
    utils.update_value(new_raw_value)

    const native_event = e.nativeEvent as unknown as { inputType?: string }
    if (native_event.inputType?.startsWith('delete')) {
      state.set_history_index(-1)
      return
    }

    if (char_before_caret == '@') {
      let should_trigger = true
      if (caret_position > 1) {
        const char_before_at = new_display_value.charAt(caret_position - 2)
        if (char_before_at == '@') {
          should_trigger = false
        }
      }

      if (should_trigger) {
        props.on_at_sign_click()
      }
    } else if (char_before_caret == '#') {
      const is_at_start = caret_position == 1
      let is_after_whitespace = false
      if (caret_position > 1) {
        const char_before_hash = new_display_value.charAt(caret_position - 2)
        is_after_whitespace = /\s/.test(char_before_hash)
      }

      if (is_at_start || is_after_whitespace) {
        props.on_hash_sign_click()
      }
    }

    state.set_history_index(-1)
  }

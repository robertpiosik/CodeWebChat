import { HandlerContext } from './types'

export const create_handle_submit =
  ({ props, state }: HandlerContext) =>
  (
    e:
      | React.KeyboardEvent<HTMLDivElement>
      | React.MouseEvent<HTMLButtonElement>,
    with_control?: boolean
  ) => {
    e.stopPropagation()
    const should_submit_with_control = with_control || e.ctrlKey || e.metaKey
    if (should_submit_with_control) {
      props.on_submit_with_control()
    } else {
      props.on_submit()
    }
    state.set_history_index(-1)
  }

import { useState, useEffect } from 'react'
import { BackendMessage } from '../../types/messages'

export const use_modal_manager = () => {
  const [progress_state, set_progress_state] = useState<{
    title: string
    subtitle?: string
    progress?: number
    tokens_per_second?: number
    cancellable?: boolean
    delay_visibility?: boolean
  }>()

  const [auto_closing_modal_data, set_auto_closing_modal_data] = useState<
    | {
        title: string
        non_dismissable?: boolean
      }
    | undefined
  >()

  const [
    is_preview_ongoing_modal_visible,
    set_is_preview_ongoing_modal_visible
  ] = useState(false)

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'SHOW_PROGRESS') {
        set_progress_state({
          title: message.title,
          subtitle: message.subtitle,
          progress: message.progress,
          cancellable: message.cancellable ?? false
        })
      } else if (message.command == 'HIDE_PROGRESS') {
        set_progress_state(undefined)
      } else if (message.command == 'SHOW_AUTO_CLOSING_MODAL') {
        set_auto_closing_modal_data({
          title: message.title,
          non_dismissable: message.non_dismissable
        })
      } else if (message.command == 'SHOW_PREVIEW_ONGOING_MODAL') {
        set_is_preview_ongoing_modal_visible(true)
      } else if (message.command == 'RESPONSE_PREVIEW_STARTED') {
        set_progress_state(undefined)
      }
    }

    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  return {
    progress_state,
    set_progress_state,
    auto_closing_modal_data,
    set_auto_closing_modal_data,
    is_preview_ongoing_modal_visible,
    set_is_preview_ongoing_modal_visible
  }
}

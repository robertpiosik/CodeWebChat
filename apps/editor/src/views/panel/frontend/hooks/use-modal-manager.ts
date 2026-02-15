import { useState, useEffect } from 'react'
import { BackendMessage } from '../../types/messages'

export const use_modal_manager = () => {
  const [progress_state, set_progress_state] = useState<{
    title: string
    progress?: number
    tokens_per_second?: number
    cancellable?: boolean
    show_elapsed_time?: boolean
    delay_visibility?: boolean
  }>()

  const [api_manager_progress_state, set_api_manager_progress_state] = useState<
    Record<
      string,
      {
        title: string
        tokens_per_second?: number
        total_tokens?: number
        cancellable?: boolean
        provider_name: string
        model?: string
        reasoning_effort?: string
      }
    >
  >({})

  const [auto_closing_modal_data, set_auto_closing_modal_data] = useState<
    { title: string; type: 'success' | 'warning' | 'error' } | undefined
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
          progress: message.progress,
          tokens_per_second: message.tokens_per_second,
          cancellable: message.cancellable ?? false,
          show_elapsed_time: message.show_elapsed_time,
          delay_visibility: message.delay_visibility
        })
      } else if (message.command == 'HIDE_PROGRESS') {
        set_progress_state(undefined)
      } else if (message.command == 'SHOW_API_MANAGER_PROGRESS') {
        set_api_manager_progress_state((prev) => ({
          ...prev,
          [message.id]: {
            title: message.title,
            tokens_per_second: message.tokens_per_second,
            total_tokens: message.total_tokens,
            cancellable: message.cancellable ?? true,
            show_elapsed_time: message.show_elapsed_time,
            delay_visibility: message.delay_visibility,
            provider_name: message.provider_name,
            model: message.model,
            reasoning_effort: message.reasoning_effort
          }
        }))
      } else if (message.command == 'HIDE_API_MANAGER_PROGRESS') {
        set_api_manager_progress_state((prev) => {
          const new_state = { ...prev }
          delete new_state[message.id]
          return new_state
        })
      } else if (message.command == 'SHOW_AUTO_CLOSING_MODAL') {
        set_auto_closing_modal_data({
          title: message.title,
          type: message.type
        })
      } else if (message.command == 'SHOW_PREVIEW_ONGOING_MODAL') {
        set_is_preview_ongoing_modal_visible(true)
      }
    }

    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  return {
    progress_state,
    set_progress_state,
    api_manager_progress_state,
    auto_closing_modal_data,
    set_auto_closing_modal_data,
    is_preview_ongoing_modal_visible,
    set_is_preview_ongoing_modal_visible
  }
}

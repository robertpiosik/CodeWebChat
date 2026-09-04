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

  const [
    prompt_view_api_calls_manager_progress_state,
    set_prompt_view_api_calls_manager_progress_state
  ] = useState<
    Record<
      string,
      {
        status: string
        provider_name: string
        tokens_per_second?: number
        total_tokens?: number
        cancellable?: boolean
        model?: string
        reasoning_effort?: string
      }
    >
  >({})

  const [auto_closing_modal_data, set_auto_closing_modal_data] = useState<
    | {
        title: string
        type: 'success' | 'warning' | 'error' | 'info'
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
          tokens_per_second: message.tokens_per_second,
          cancellable: message.cancellable ?? false,
          delay_visibility: message.delay_visibility
        })
      } else if (message.command == 'HIDE_PROGRESS') {
        set_progress_state(undefined)
      } else if (
        message.command == 'SHOW_PROMPT_VIEW_API_CALLS_MANAGER_PROGRESS'
      ) {
        set_prompt_view_api_calls_manager_progress_state((prev) => ({
          ...prev,
          [message.id]: {
            status: message.status,
            tokens_per_second: message.tokens_per_second,
            total_tokens: message.total_tokens,
            provider_name: message.provider_name,
            model: message.model,
            reasoning_effort: message.reasoning_effort
          }
        }))
      } else if (
        message.command == 'HIDE_PROMPT_VIEW_API_CALLS_MANAGER_PROGRESS'
      ) {
        set_prompt_view_api_calls_manager_progress_state((prev) => {
          const new_state = { ...prev }
          delete new_state[message.id]
          return new_state
        })
      } else if (message.command == 'SHOW_AUTO_CLOSING_MODAL') {
        set_auto_closing_modal_data({
          title: message.title,
          type: message.type,
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
    prompt_view_api_calls_manager_progress_state,
    auto_closing_modal_data,
    set_auto_closing_modal_data,
    is_preview_ongoing_modal_visible,
    set_is_preview_ongoing_modal_visible
  }
}

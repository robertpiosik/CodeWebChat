import { useEffect, useState } from 'react'
import { Progress as UiProgress } from '@ui/components/editor/api-manager/Progress'
import { BackendMessage } from '../types/messages'

const vscode = acquireVsCodeApi()

export const ApiManager = () => {
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

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command === 'SHOW_API_MANAGER_PROGRESS') {
        set_api_manager_progress_state((prev) => ({
          ...prev,
          [message.id]: {
            title: message.title,
            tokens_per_second: message.tokens_per_second,
            total_tokens: message.total_tokens,
            provider_name: message.provider_name,
            model: message.model,
            reasoning_effort: message.reasoning_effort
          }
        }))
      } else if (message.command === 'HIDE_API_MANAGER_PROGRESS') {
        set_api_manager_progress_state((prev) => {
          const new_state = { ...prev }
          delete new_state[message.id]
          return new_state
        })
      }
    }

    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  if (Object.keys(api_manager_progress_state).length === 0) return null

  return (
    <UiProgress
      progress_items={Object.entries(api_manager_progress_state).map(
        ([id, state]) => ({ id, ...state })
      )}
      on_cancel={(id) =>
        vscode.postMessage({ command: 'CANCEL_API_MANAGER_REQUEST', id })
      }
    />
  )
}

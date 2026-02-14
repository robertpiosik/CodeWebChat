import { useState, useEffect } from 'react'
import { BackendMessage } from '../../../types/messages'
import { ResponseHistoryItem } from '@shared/types/response-history-item'
import { post_message } from '../../utils/post_message'

export const use_response_history = (vscode: any) => {
  const [response_history, set_response_history] = useState<
    ResponseHistoryItem[]
  >([])
  const [
    selected_history_item_created_at,
    set_selected_history_item_created_at
  ] = useState<number>()

  const handle_remove_response_history_item = (created_at?: number) => {
    if (created_at) {
      set_response_history((prev) =>
        prev.filter((i) => i.created_at != created_at)
      )
      post_message(vscode, {
        command: 'REMOVE_RESPONSE_HISTORY_ITEM',
        created_at
      })
    }
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'RESPONSE_HISTORY') {
        set_response_history(message.history)
      } else if (message.command == 'RESPONSE_PREVIEW_STARTED') {
        if (message.created_at) {
          set_selected_history_item_created_at(message.created_at)
        }
      }
    }

    window.addEventListener('message', handle_message)
    post_message(vscode, { command: 'GET_RESPONSE_HISTORY' })

    return () => window.removeEventListener('message', handle_message)
  }, [])

  return {
    response_history,
    set_response_history,
    selected_history_item_created_at,
    set_selected_history_item_created_at,
    handle_remove_response_history_item
  }
}

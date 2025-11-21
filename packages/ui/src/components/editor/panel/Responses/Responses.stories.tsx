import { useState } from 'react'
import { Responses } from './Responses'
import { ResponseHistoryItem } from '@shared/types/response-history-item'

export default {
  component: Responses
}

const response_history: ResponseHistoryItem[] = [
  {
    response: 'response 1',
    raw_instructions: 'instruction 1',
    created_at: Date.now() - 1000 * 60 * 5, // 5 minutes ago
    lines_added: 10,
    lines_removed: 2
  },
  {
    response: 'response 2',
    raw_instructions: 'instruction 2',
    created_at: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    lines_added: 5,
    lines_removed: 8
  },
  {
    response: 'response 3',
    raw_instructions:
      'instruction 3, very long instruction that should be truncated with an ellipsis',
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
    lines_added: 20,
    lines_removed: 1
  }
]

export const Primary = () => {
  const [selected, set_selected] = useState<number>()
  return (
    <Responses
      response_history={response_history}
      selected_history_item_created_at={selected}
      on_response_history_item_click={(item) =>
        console.log('item clicked', item)
      }
      on_selected_history_item_change={(created_at) => {
        console.log('selection changed', created_at)
        set_selected(created_at)
      }}
      on_response_history_item_remove={(created_at) => {
        console.log('remove item', created_at)
      }}
    />
  )
}

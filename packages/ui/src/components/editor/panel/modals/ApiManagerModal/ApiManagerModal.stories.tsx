import { useState } from 'react'
import { ApiManagerModal } from './ApiManagerModal'

export default {
  component: ApiManagerModal
}

export const Default = () => {
  const [items, set_items] = useState([
    {
      id: '1',
      title: 'Receiving...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    }
  ])

  const handle_cancel = (id: string) => {
    set_items((prev) => prev.filter((i) => i.id !== id))
  }

  return items.length > 0 ? (
    <ApiManagerModal progress_items={items} on_cancel={handle_cancel} />
  ) : (
    <button
      onClick={() =>
        set_items([
          {
            id: '1',
            title: 'Receiving...',
            provider_name: 'OpenAI',
            model: 'gpt-5.2'
          }
        ])
      }
    >
      Reset
    </button>
  )
}

export const MultipleItems = () => {
  const initial_items = [
    {
      id: '1',
      title: 'Thinking...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '2',
      title: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '3',
      title: 'Waiting for connection...',
      provider_name: 'Anthropic',
      model: 'claude-4-5-sonnet'
    },
    {
      id: '4',
      title: 'Thinking...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '5',
      title: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '6',
      title: 'Waiting for connection...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '7',
      title: 'Thinking...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '8',
      title: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '9',
      title: 'Waiting for connection...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '10',
      title: 'Thinking...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '11',
      title: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '12',
      title: 'Waiting for connection...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '13',
      title: 'Thinking...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '14',
      title: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '15',
      title: 'Waiting for connection...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    }
  ]

  const [items, set_items] = useState(initial_items)

  const handle_cancel = (id: string) => {
    set_items((prev) => prev.filter((i) => i.id !== id))
  }

  return items.length > 0 ? (
    <ApiManagerModal progress_items={items} on_cancel={handle_cancel} />
  ) : (
    <button onClick={() => set_items(initial_items)}>Reset</button>
  )
}

import { useState } from 'react'
import { OngoingApiCallsModal } from './OngoingApiCallsModal'

export default {
  component: OngoingApiCallsModal
}

export const Default = () => {
  const [items, set_items] = useState([
    {
      id: '1',
      status: 'Receiving...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    }
  ])

  const handle_cancel = (id: string) => {
    set_items((prev) => prev.filter((i) => i.id !== id))
  }

  return items.length > 0 ? (
    <OngoingApiCallsModal progress_items={items} on_cancel={handle_cancel} />
  ) : (
    <button
      onClick={() =>
        set_items([
          {
            id: '1',
            status: 'Receiving...',
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
      status: 'Thinking...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '2',
      status: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '3',
      status: 'Waiting for connection...',
      provider_name: 'Anthropic',
      model: 'claude-4-5-sonnet'
    },
    {
      id: '4',
      status: 'Thinking...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '5',
      status: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '6',
      status: 'Waiting for connection...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '7',
      status: 'Thinking...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '8',
      status: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '9',
      status: 'Waiting for connection...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '10',
      status: 'Thinking...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '11',
      status: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '12',
      status: 'Waiting for connection...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '13',
      status: 'Thinking...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '14',
      status: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '15',
      status: 'Waiting for connection...',
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    }
  ]

  const [items, set_items] = useState(initial_items)

  const handle_cancel = (id: string) => {
    set_items((prev) => prev.filter((i) => i.id !== id))
  }

  return items.length > 0 ? (
    <OngoingApiCallsModal progress_items={items} on_cancel={handle_cancel} />
  ) : (
    <button onClick={() => set_items(initial_items)}>Reset</button>
  )
}

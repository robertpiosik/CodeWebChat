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
      show_elapsed_time: true,
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
            show_elapsed_time: true,
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
  const [items, set_items] = useState([
    {
      id: '1',
      title: 'Thinking...',
      show_elapsed_time: true,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '2',
      title: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      show_elapsed_time: true,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '3',
      title: 'Waiting for connection...',
      show_elapsed_time: true,
      provider_name: 'Anthropic',
      model: 'claude-4-5-sonnet'
    },
    {
      id: '1',
      title: 'Thinking...',
      show_elapsed_time: true,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '2',
      title: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      show_elapsed_time: true,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '3',
      title: 'Waiting for connection...',
      show_elapsed_time: true,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '1',
      title: 'Thinking...',
      show_elapsed_time: true,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '2',
      title: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      show_elapsed_time: true,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '3',
      title: 'Waiting for connection...',
      show_elapsed_time: true,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '1',
      title: 'Thinking...',
      show_elapsed_time: true,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '2',
      title: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      show_elapsed_time: true,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '3',
      title: 'Waiting for connection...',
      show_elapsed_time: true,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '1',
      title: 'Thinking...',
      show_elapsed_time: true,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '2',
      title: 'Receiving...',
      tokens_per_second: 145,
      total_tokens: 320,
      show_elapsed_time: true,
      provider_name: 'OpenAI',
      model: 'gpt-5.2'
    },
    {
      id: '3',
      title: 'Waiting for connection...',
      show_elapsed_time: true,
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
            title: 'Thinking...',
            show_elapsed_time: true,
            provider_name: 'OpenAI',
            model: 'gpt-5.2'
          },
          {
            id: '2',
            title: 'Receiving...',
            tokens_per_second: 145,
            total_tokens: 320,
            show_elapsed_time: true,
            provider_name: 'OpenAI',
            model: 'gpt-5.2'
          },
          {
            id: '3',
            title: 'Waiting for connection...',
            show_elapsed_time: true,
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

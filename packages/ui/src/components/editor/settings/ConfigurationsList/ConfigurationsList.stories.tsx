import { useState } from 'react'
import { ConfigurationsList } from './ConfigurationsList'

export default {
  component: ConfigurationsList
}

const initial_configurations: ConfigurationsList.Configuration[] = [
  {
    id: '1',
    model: 'gpt-4o',
    description: 'OpenAI - 1.0 temp',
    is_default: true
  },
  {
    id: '2',
    model: 'claude-3-haiku-20240307',
    description: 'Anthropic - 0.7 temp'
  },
  {
    id: '3',
    model: 'gemini-1.5-flash',
    description: 'Google - cache on'
  }
]

const log_action =
  (action: string) =>
  (...args: any[]) => {
    console.log(action, ...args)
  }

export const Default = () => {
  const [configurations, set_configurations] = useState(initial_configurations)

  const handle_set_default = (id: string) => {
    set_configurations(
      configurations.map((c) => ({
        ...c,
        is_default: c.id == id
      }))
    )
    log_action('on_set_default')(id)
  }

  const handle_unset_default = () => {
    set_configurations(
      configurations.map((c) => ({
        ...c,
        is_default: false
      }))
    )
    log_action('on_unset_default')()
  }

  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: 'var(--vscode-sideBar-background)'
      }}
    >
      <ConfigurationsList
        configurations={configurations}
        on_reorder={(reordered) => {
          set_configurations(reordered)
          log_action('on_reorder')(reordered)
        }}
        on_edit={log_action('on_edit')}
        on_delete={log_action('on_delete')}
        on_add={log_action('on_add')}
        on_set_default={handle_set_default}
        on_unset_default={handle_unset_default}
      />
    </div>
  )
}

export const NoDefaultOption = () => {
  const [configurations, set_configurations] = useState(
    initial_configurations.map(({ is_default, ...c }) => c)
  )

  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: 'var(--vscode-sideBar-background)'
      }}
    >
      <ConfigurationsList
        configurations={configurations}
        on_reorder={(reordered) => {
          set_configurations(reordered)
          log_action('on_reorder')(reordered)
        }}
        on_edit={log_action('on_edit')}
        on_delete={log_action('on_delete')}
        on_add={log_action('on_add')}
      />
    </div>
  )
}

export const Empty = () => {
  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: 'var(--vscode-sideBar-background)'
      }}
    >
      <ConfigurationsList
        configurations={[]}
        on_reorder={log_action('on_reorder')}
        on_edit={log_action('on_edit')}
        on_delete={log_action('on_delete')}
        on_add={log_action('on_add')}
        on_set_default={log_action('on_set_default')}
        on_unset_default={log_action('on_unset_default')}
      />
    </div>
  )
}
